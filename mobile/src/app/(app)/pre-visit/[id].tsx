import { FORM_FIELD_LIMITS } from '@ceenaix/shared/form-field-limits';
import type { PreVisitAnswerDraft, PreVisitTemplateQuestionDraft } from '@ceenaix/shared/pre-visit';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AiGeneratedTag,
  Button,
  Card,
  DateField,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  InlineMessage,
  Pill,
  ProgressBar,
  Screen,
  SkeletonList,
  Text,
  TextField,
} from '@/components/ui';
import {
  applyAnswer,
  completePreVisitAssessment,
  confirmAutofill,
  finishPreVisitWithUpdates,
  formatPreVisitAppointmentLabel,
  getRequiredQuestionIssues,
  hasAnswerValue,
  needsAutofillConfirmation,
  persistPreVisitAssessment,
} from '@/data/pre-visit';
import { alertDialog } from '@/lib/dialog';
import { usePreVisitAssessment } from '@/data/web/hooks/use-pre-visit';
import { formatCanonicalValueForReview } from '@/data/web/lib/canonical-record-updates';
import { formatDateTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type Phase = { kind: 'intro' } | { kind: 'question'; index: number } | { kind: 'review' } | { kind: 'updates' };
type Feedback = { tone: 'success' | 'danger'; message: string } | null;

function OptionRow({ label, selected, multi, onPress }: { label: string; selected: boolean; multi?: boolean; onPress: () => void }): React.ReactElement {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.option,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.tones.brand.bg : colors.surface,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon
        name={multi ? (selected ? 'checkbox' : 'square-outline') : selected ? 'radio-button-on' : 'radio-button-off'}
        color={selected ? colors.primary : colors.textSubtle}
      />
      <Text variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function QuestionInput({
  question,
  answer,
  onChange,
}: {
  question: PreVisitTemplateQuestionDraft;
  answer: PreVisitAnswerDraft | undefined;
  onChange: (value: string | string[]) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const text = answer?.answerText ?? '';
  const multi = Array.isArray(answer?.answerJson) ? (answer.answerJson as string[]) : [];
  const placeholder = t('patient.preVisit.typeAnswerPh');

  switch (question.type) {
    case 'long_text':
      return (
        <TextField
          value={text}
          onChangeText={onChange}
          multiline
          placeholder={placeholder}
          maxLength={FORM_FIELD_LIMITS.clinicalNotes}
          accessibilityLabel={question.label}
        />
      );
    case 'number':
      return <TextField value={text} onChangeText={onChange} keyboardType="decimal-pad" placeholder={placeholder} accessibilityLabel={question.label} />;
    case 'date':
      return <DateField value={text} onChange={onChange} />;
    case 'boolean':
      return (
        <View style={{ gap: spacing.sm }}>
          {(['Yes', 'No'] as const).map((value) => (
            <OptionRow
              key={value}
              label={value === 'Yes' ? t('m.preVisit.yes') : t('m.preVisit.no')}
              selected={text === value}
              onPress={() => onChange(value)}
            />
          ))}
        </View>
      );
    case 'single_select':
      return (
        <View style={{ gap: spacing.sm }}>
          {question.options.map((option) => (
            <OptionRow key={option.value} label={option.label} selected={text === option.value} onPress={() => onChange(option.value)} />
          ))}
        </View>
      );
    case 'multi_select':
      return (
        <View style={{ gap: spacing.sm }}>
          {question.options.map((option) => {
            const checked = multi.includes(option.value);
            return (
              <OptionRow
                key={option.value}
                multi
                label={option.label}
                selected={checked}
                onPress={() => onChange(checked ? multi.filter((value) => value !== option.value) : [...multi, option.value])}
              />
            );
          })}
        </View>
      );
    default:
      return (
        <TextField value={text} onChangeText={onChange} placeholder={placeholder} maxLength={FORM_FIELD_LIMITS.shortText} accessibilityLabel={question.label} />
      );
  }
}

// One question per screen instead of the web's long form, with an intro, a
// review list and the record-update decision as their own steps. Persistence
// and the AI summary run through `@/data/pre-visit` (web handler mirror).
export default function PreVisitScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, refetch } = usePreVisitAssessment(id ?? null);
  const [answers, setAnswers] = useState<PreVisitAnswerDraft[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [busy, setBusy] = useState<'save' | 'complete' | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!data || hydrated) return;
    setAnswers(data.answers);
    setHydrated(true);
    if (data.pendingCanonicalUpdates.length > 0) setPhase({ kind: 'updates' });
    else if (data.assessment.status === 'completed' || data.assessment.status === 'reviewed') setPhase({ kind: 'review' });
  }, [data, hydrated]);

  const questions = useMemo(() => data?.assessment.snapshot.questions ?? [], [data]);
  const issues = useMemo(() => getRequiredQuestionIssues(questions, answers), [answers, questions]);
  const answerFor = (key: string) => answers.find((answer) => answer.questionKey === key);

  const done = () =>
    router.dismissTo({
      pathname: '/appointments',
      params: { banner: 'previsit' },
    });

  const run = async (kind: 'save' | 'complete', task: () => Promise<void>) => {
    setBusy(kind);
    setFeedback(null);
    try {
      await task();
    } catch (taskError) {
      haptics.error();
      setFeedback({
        tone: 'danger',
        message: taskError instanceof Error ? taskError.message : t('m.common.unexpected'),
      });
    } finally {
      setBusy(null);
    }
  };

  const save = (thenExit: boolean) =>
    run('save', async () => {
      if (!data) return;
      await persistPreVisitAssessment(data, answers, 'in_progress');
      setDirty(false);
      haptics.success();
      if (thenExit) router.back();
      else {
        setFeedback({ tone: 'success', message: t('m.preVisit.saved') });
        await refetch();
      }
    });

  const complete = () =>
    run('complete', async () => {
      if (!data) return;
      if (issues.length > 0) {
        const first = questions.findIndex((question) => question.key === issues[0]?.key);
        setPhase({ kind: 'question', index: Math.max(first, 0) });
        return;
      }
      const result = await completePreVisitAssessment(data, answers, i18n.language);
      if (result === 'review') {
        await refetch();
        setPhase({ kind: 'updates' });
        return;
      }
      haptics.success();
      done();
    });

  const finishWithUpdates = (mode: 'apply' | 'skip') =>
    run('complete', async () => {
      if (!data) return;
      await finishPreVisitWithUpdates(data, answers, i18n.language, mode);
      haptics.success();
      done();
    });

  const close = () => {
    if (!dirty || busy) {
      router.back();
      return;
    }
    alertDialog(t('m.preVisit.exitTitle'), t('m.preVisit.exitBody'), [
      { text: t('m.preVisit.saveExit'), onPress: () => void save(true) },
      {
        text: t('m.preVisit.exitWithout'),
        style: 'destructive',
        onPress: () => router.back(),
      },
      { text: t('m.preVisit.keepGoing'), style: 'cancel' },
    ]);
  };

  const update = (question: PreVisitTemplateQuestionDraft, value: string | string[]) => {
    setAnswers((current) => applyAnswer(current, question, value));
    setDirty(true);
    setFeedback(null);
  };

  const topBar = (subtitle: string, progress?: number) => (
    <>
      <View style={styles.topBar}>
        <IconButton name="close" variant="plain" accessibilityLabel={t('m.common.close')} onPress={close} />
        <View style={{ flex: 1 }}>
          <Text variant="micro" color="subtle" numberOfLines={1}>
            {t('patient.preVisit.title')}
          </Text>
          <Text variant="captionStrong" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      {progress !== undefined ? (
        <View style={{ marginBottom: spacing.lg }}>
          <ProgressBar value={progress} />
        </View>
      ) : null}
      {feedback ? (
        <View style={{ marginBottom: spacing.md }}>
          <InlineMessage tone={feedback.tone} message={feedback.message} />
        </View>
      ) : null}
    </>
  );

  if (loading && !data) {
    return (
      <Screen testID="screen-pre-visit" edgeTop>
        {topBar('')}
        <SkeletonList count={3} height={120} />
      </Screen>
    );
  }
  if (error && !data) {
    return (
      <Screen testID="screen-pre-visit" edgeTop>
        {topBar('')}
        <ErrorState message={t('patient.preVisit.loadError')} onRetry={() => void refetch()} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen testID="screen-pre-visit" edgeTop>
        {topBar('')}
        <EmptyState icon="clipboard-outline" title={t('m.preVisit.notFoundTitle')} body={t('m.preVisit.notFoundBody')} />
      </Screen>
    );
  }

  const { assessment } = data;
  const appointmentLabel = formatPreVisitAppointmentLabel(assessment.appointment, i18n.language);

  if (phase.kind === 'intro') {
    const firstOpen = questions.findIndex((question) => !hasAnswerValue(answerFor(question.key)) || needsAutofillConfirmation(answerFor(question.key)));
    const started = answers.some((answer) => hasAnswerValue(answer));
    return (
      <Screen
        testID="screen-pre-visit"
        edgeTop
        footer={
          <Button
            label={started ? t('m.preVisit.resume') : t('m.preVisit.start')}
            fullWidth
            size="lg"
            onPress={() => setPhase(questions.length === 0 ? { kind: 'review' } : { kind: 'question', index: firstOpen >= 0 ? firstOpen : 0 })}
          />
        }
      >
        {topBar(assessment.templateTitle)}
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <Pill tone="info" label={t(`m.preVisit.status_${assessment.status}`)} />
            <Text variant="title">{assessment.templateTitle}</Text>
            <Text variant="body" color="muted">
              {appointmentLabel}
            </Text>
          </View>
          <Card tone="brand">
            <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
              {t('m.preVisit.howTitle')}
            </Text>
            {[t('m.preVisit.how1'), t('m.preVisit.how2'), t('m.preVisit.how3')].map((line, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 4 }}>
                <Icon name="checkmark-circle" size={18} />
                <Text variant="caption" style={{ flex: 1 }}>
                  {line}
                </Text>
              </View>
            ))}
          </Card>
          <Text variant="caption" color="muted">
            {t('m.preVisit.questionCount', { count: questions.length })}
          </Text>
        </View>
      </Screen>
    );
  }

  if (phase.kind === 'question') {
    const question = questions[Math.min(phase.index, questions.length - 1)];
    if (!question)
      return (
        <Screen testID="screen-pre-visit" edgeTop>
          {topBar('')}
        </Screen>
      );
    const answer = answerFor(question.key);
    const pendingAutofill = needsAutofillConfirmation(answer);
    const answered = hasAnswerValue(answer);
    const isLast = phase.index === questions.length - 1;
    const goNext = () => {
      if (pendingAutofill) {
        setAnswers((current) => confirmAutofill(current, question.key));
        setDirty(true);
      }
      haptics.tap();
      setPhase(isLast ? { kind: 'review' } : { kind: 'question', index: phase.index + 1 });
    };
    const nextLabel = pendingAutofill
      ? t('m.preVisit.confirm')
      : !answered && !question.required
        ? t('m.common.skip')
        : isLast
          ? t('m.preVisit.reviewAnswers')
          : t('m.common.next');

    return (
      <Screen
        testID="screen-pre-visit"
        edgeTop
        keyboard
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label={t('m.common.back')}
                variant="secondary"
                fullWidth
                onPress={() => setPhase(phase.index === 0 ? { kind: 'intro' } : { kind: 'question', index: phase.index - 1 })}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Button label={nextLabel} fullWidth disabled={question.required && !answered} onPress={goNext} />
            </View>
          </View>
        }
      >
        {topBar(
          t('m.preVisit.questionOf', {
            current: phase.index + 1,
            total: questions.length,
          }),
          (phase.index + 1) / (questions.length + 1)
        )}
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <Text variant="micro" color={question.required ? 'danger' : 'subtle'}>
              {question.required ? t('m.preVisit.required') : t('m.preVisit.optional')}
            </Text>
            <Text variant="title" accessibilityRole="header">
              {question.label}
            </Text>
            {question.helpText ? (
              <Text variant="body" color="muted">
                {question.helpText}
              </Text>
            ) : null}
          </View>
          {pendingAutofill ? (
            <InlineMessage tone="info" message={`${answer?.autofillLabel ?? t('patient.preVisit.autofilled')} — ${t('m.preVisit.autofillReview')}`} />
          ) : null}
          <QuestionInput question={question} answer={answer} onChange={(value) => update(question, value)} />
        </View>
      </Screen>
    );
  }

  if (phase.kind === 'updates') {
    return (
      <Screen
        testID="screen-pre-visit"
        edgeTop
        footer={
          <View style={{ gap: spacing.sm }}>
            <Button
              label={t('m.preVisit.applyFinish')}
              fullWidth
              loading={busy === 'complete'}
              disabled={busy !== null}
              onPress={() => void finishWithUpdates('apply')}
            />
            <Button label={t('m.preVisit.finishWithout')} variant="ghost" fullWidth disabled={busy !== null} onPress={() => void finishWithUpdates('skip')} />
          </View>
        }
      >
        {topBar(assessment.templateTitle, 1)}
        <View style={{ gap: spacing.md }}>
          <Text variant="title">{t('m.preVisit.updatesTitle')}</Text>
          <Text variant="body" color="muted">
            {t('m.preVisit.updatesBody')}
          </Text>
          {data.pendingCanonicalUpdates.map((item) => (
            <Card key={item.id}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  marginBottom: spacing.sm,
                }}
              >
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {item.displayLabel}
                </Text>
                <Pill
                  tone={item.requiresDoctorReview ? 'ai' : 'success'}
                  label={item.requiresDoctorReview ? t('patient.aiChat.badgeDoctorReview') : t('patient.aiChat.badgeUpdateRecord')}
                />
              </View>
              <Text variant="caption" color="muted">
                {t('patient.aiChat.fieldCurrent')}: {formatCanonicalValueForReview(item.currentValue)}
              </Text>
              <Text variant="caption">
                {t('m.preVisit.newAnswer')}: {formatCanonicalValueForReview(item.proposedValue)}
              </Text>
            </Card>
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      testID="screen-pre-visit"
      edgeTop
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              label={t('patient.preVisit.saveProgress')}
              variant="secondary"
              fullWidth
              loading={busy === 'save'}
              disabled={busy !== null}
              onPress={() => void save(false)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={busy === 'complete' ? t('patient.preVisit.completing') : t('patient.preVisit.complete')}
              variant="ai"
              icon="sparkles"
              fullWidth
              loading={busy === 'complete'}
              disabled={busy !== null || issues.length > 0}
              onPress={() => void complete()}
            />
          </View>
        </View>
      }
    >
      {topBar(assessment.templateTitle, 1)}
      <View style={{ gap: spacing.md }}>
        <Text variant="title">{t('m.preVisit.reviewTitle')}</Text>
        <Text variant="caption" color={issues.length > 0 ? 'danger' : 'success'}>
          {issues.length > 0 ? t('m.preVisit.issues', { count: issues.length }) : t('m.preVisit.allReady')}
        </Text>
        {questions.map((question, index) => {
          const answer = answerFor(question.key);
          const missing = question.required && (!hasAnswerValue(answer) || needsAutofillConfirmation(answer));
          return (
            <Card key={question.key} onPress={() => setPhase({ kind: 'question', index })} accessibilityLabel={question.label}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  alignItems: 'flex-start',
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="captionStrong" color="muted">
                    {question.label}
                  </Text>
                  <Text variant="body" color={hasAnswerValue(answer) ? 'default' : missing ? 'danger' : 'subtle'}>
                    {hasAnswerValue(answer) ? answer?.answerText : t('m.preVisit.notAnswered')}
                  </Text>
                </View>
                <Icon name={missing ? 'alert-circle' : 'create-outline'} size={18} />
              </View>
            </Card>
          );
        })}
        {assessment.summary ? (
          <Card tone="ai">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                marginBottom: spacing.sm,
              }}
            >
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {t('m.preVisit.latestSummary')}
              </Text>
              <AiGeneratedTag />
            </View>
            <Text variant="micro" color="subtle" style={{ marginBottom: spacing.sm }}>
              {t('m.preVisit.generated', {
                when: formatDateTime(assessment.summary.generatedAt),
              })}
            </Text>
            <Text variant="body">{assessment.summary.summaryText}</Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
