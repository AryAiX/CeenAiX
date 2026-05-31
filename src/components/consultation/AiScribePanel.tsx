import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, RefreshCw, Save, Sparkles, Wand2 } from 'lucide-react';
import type {
  ClinicalNoteOutputLanguage,
  ClinicalNotePromptTemplate,
} from '../../types';
import type { ConsultationScribeController } from '../../hooks/use-consultation-scribe-controller';
import { TranscriptPanel } from './TranscriptPanel';
import { SmartSuggestions } from './SmartSuggestions';

export interface AppliedSoap {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface AiScribePanelProps {
  controller: ConsultationScribeController;
  patientId: string;
  appointmentId: string;
  doctorName: string;
  approvalDateLabel: (iso: string) => string;
  onApplySoap: (soap: AppliedSoap) => void;
  onApproveAndSave: (soap: AppliedSoap) => Promise<void>;
}

const AiBadge = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
    <Sparkles className="h-3 w-3" />
    {label}
  </span>
);

const linesToText = (lines: string[]): string => lines.join('\n');

const TEMPLATES: ClinicalNotePromptTemplate[] = ['general', 'pediatric', 'cardiology', 'brief'];

export function AiScribePanel({
  controller,
  patientId,
  appointmentId,
  doctorName,
  approvalDateLabel,
  onApplySoap,
  onApproveAndSave,
}: AiScribePanelProps) {
  const { t } = useTranslation('common');
  const note = controller.data?.note ?? null;
  const transcript = controller.data?.transcript ?? null;
  const recording = controller.data?.recording ?? null;

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [symptomsText, setSymptomsText] = useState('');
  const [educationText, setEducationText] = useState('');

  const [template, setTemplate] = useState<ClinicalNotePromptTemplate>('general');
  const [outputLanguage, setOutputLanguage] = useState<ClinicalNoteOutputLanguage>('en');
  const [customInstructions, setCustomInstructions] = useState('');
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [showTranscriptEditor, setShowTranscriptEditor] = useState(false);
  const [approving, setApproving] = useState(false);

  const original = useMemo(
    () => ({
      chiefComplaint: note?.chief_complaint ?? '',
      subjective: note?.soap_subjective ?? '',
      objective: note?.soap_objective ?? '',
      assessment: note?.soap_assessment ?? '',
      plan: note?.soap_plan ?? '',
      symptoms: linesToText(note?.symptoms ?? []),
      education: linesToText(note?.education_points ?? []),
    }),
    [note]
  );

  useEffect(() => {
    setChiefComplaint(original.chiefComplaint);
    setSubjective(original.subjective);
    setObjective(original.objective);
    setAssessment(original.assessment);
    setPlan(original.plan);
    setSymptomsText(original.symptoms);
    setEducationText(original.education);
    if (note) {
      setTemplate(note.prompt_template ?? 'general');
      setOutputLanguage(note.output_language ?? 'en');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  useEffect(() => {
    setTranscriptDraft(transcript?.full_text ?? '');
  }, [transcript?.full_text]);

  const collectSoap = (): AppliedSoap => ({ subjective, objective, assessment, plan });

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApproveAndSave(collectSoap());
    } finally {
      setApproving(false);
    }
  };

  const labelTextarea = (
    labelKey: string,
    value: string,
    setter: (next: string) => void,
    originalValue: string,
    rows = 4
  ) => (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
        {t(labelKey)}
        {value === originalValue && value.trim().length > 0 ? (
          <AiBadge label={t('doctor.consultationScribe.aiBadge')} />
        ) : null}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => setter(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );

  // Empty state: no recording captured yet.
  if (!recording) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Sparkles className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-lg font-bold text-slate-900">
          {t('doctor.consultationScribe.scribe.emptyTitle')}
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          {t('doctor.consultationScribe.scribe.emptyBody')}
        </p>
      </div>
    );
  }

  const processingActive = controller.isTranscribing || controller.isGenerating;
  const canRetry = !processingActive && !note;

  return (
    <div className="space-y-5">
      {controller.suggestions.length > 0 || controller.isLoadingSuggestions ? (
        <SmartSuggestions
          suggestions={controller.suggestions}
          isLoading={controller.isLoadingSuggestions}
          patientId={patientId}
          appointmentId={appointmentId}
          onDismiss={controller.dismissSuggestion}
        />
      ) : null}

      {processingActive ? (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          {controller.isTranscribing
            ? t('doctor.consultationScribe.scribe.transcribing')
            : t('doctor.consultationScribe.scribe.generating')}
        </div>
      ) : null}

      {canRetry ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{t('doctor.consultationScribe.scribe.notProcessed')}</span>
          <button
            type="button"
            onClick={() => void controller.retryProcessing()}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {t('doctor.consultationScribe.scribe.transcribeDraft')}
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Transcript column */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              {t('doctor.consultationScribe.scribe.transcriptColumn')}
            </h3>
            {transcript?.language ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                {transcript.language}
              </span>
            ) : null}
          </div>
          <TranscriptPanel
            transcript={transcript}
            isTranscribing={controller.isTranscribing}
            onSegmentsChange={
              transcript ? (segments) => void controller.relabelSegments(segments) : undefined
            }
          />
        </section>

        {/* AI note column */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">
              {t('doctor.consultationScribe.scribe.noteColumn')}
            </h3>
            {note?.generated_at ? (
              <span className="font-['DM_Mono'] text-[10px] text-slate-400">
                {t('doctor.consultationScribe.scribe.model', { model: note.model_used ?? 'AI' })}
              </span>
            ) : null}
          </div>

          {note ? (
            <div className="space-y-4">
              {labelTextarea(
                'doctor.consultationScribe.scribe.chiefComplaint',
                chiefComplaint,
                setChiefComplaint,
                original.chiefComplaint,
                2
              )}
              {labelTextarea('doctor.appointmentDetail.subjective', subjective, setSubjective, original.subjective)}
              {labelTextarea('doctor.appointmentDetail.objective', objective, setObjective, original.objective)}
              {labelTextarea('doctor.appointmentDetail.assessment', assessment, setAssessment, original.assessment)}
              {labelTextarea('doctor.appointmentDetail.plan', plan, setPlan, original.plan)}

              {labelTextarea(
                'doctor.consultationScribe.scribe.symptoms',
                symptomsText,
                setSymptomsText,
                original.symptoms,
                3
              )}

              {note.medications.length > 0 ? (
                <div>
                  <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {t('doctor.consultationScribe.scribe.medications')}
                    <AiBadge label={t('doctor.consultationScribe.aiBadge')} />
                  </p>
                  <ul className="space-y-1.5 text-sm text-slate-700">
                    {note.medications.map((medication, index) => (
                      <li key={`${medication.name}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                        <span className="font-semibold text-slate-900">{medication.name}</span>
                        {[medication.dosage, medication.frequency].filter(Boolean).length > 0 ? (
                          <span className="text-slate-500">
                            {' · '}
                            {[medication.dosage, medication.frequency].filter(Boolean).join(' · ')}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {note.diagnoses.length > 0 ? (
                <div>
                  <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {t('doctor.consultationScribe.scribe.diagnoses')}
                    <AiBadge label={t('doctor.consultationScribe.aiBadge')} />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {note.diagnoses.map((diagnosis, index) => (
                      <span
                        key={`${diagnosis.description}-${index}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                      >
                        {diagnosis.description}
                        {diagnosis.icd10_code ? (
                          <span className="rounded-full bg-cyan-100 px-1.5 py-0.5 font-['DM_Mono'] text-[10px] font-semibold text-cyan-700">
                            {diagnosis.icd10_code}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {note.follow_up.length > 0 ? (
                <div>
                  <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {t('doctor.consultationScribe.scribe.followUp')}
                    <AiBadge label={t('doctor.consultationScribe.aiBadge')} />
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {note.follow_up.map((item, index) => (
                      <li key={`${item.action}-${index}`}>{item.action}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {labelTextarea(
                'doctor.consultationScribe.scribe.education',
                educationText,
                setEducationText,
                original.education,
                3
              )}

              {note.approved_at ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">
                  {t('doctor.consultationScribe.scribe.approvedFooter', {
                    doctor: doctorName,
                    date: approvalDateLabel(note.approved_at),
                  })}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onApplySoap(collectSoap())}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Save className="h-4 w-4" />
                  {t('doctor.consultationScribe.scribe.applySoap')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleApprove()}
                  disabled={approving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t('doctor.consultationScribe.scribe.approveSave')}
                </button>
              </div>
            </div>
          ) : !processingActive ? (
            <p className="text-sm text-slate-500">{t('doctor.consultationScribe.scribe.noNote')}</p>
          ) : null}
        </section>
      </div>

      {/* Re-generation controls */}
      {note ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              {t('doctor.consultationScribe.scribe.regenerateTitle')}
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">
                {t('doctor.consultationScribe.scribe.template')}
              </span>
              <select
                value={template}
                onChange={(event) => setTemplate(event.target.value as ClinicalNotePromptTemplate)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {TEMPLATES.map((value) => (
                  <option key={value} value={value}>
                    {t(`doctor.consultationScribe.scribe.template_${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">
                {t('doctor.consultationScribe.scribe.outputLanguage')}
              </span>
              <select
                value={outputLanguage}
                onChange={(event) => setOutputLanguage(event.target.value as ClinicalNoteOutputLanguage)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </label>
          </div>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-semibold text-slate-700">
              {t('doctor.consultationScribe.scribe.customInstructions')}
            </span>
            <input
              type="text"
              value={customInstructions}
              onChange={(event) => setCustomInstructions(event.target.value)}
              placeholder={t('doctor.consultationScribe.scribe.customInstructionsPlaceholder')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void controller.regenerate({
                  promptTemplate: template,
                  outputLanguage,
                  customInstructions: customInstructions.trim() || null,
                  transcriptOverride: null,
                })
              }
              disabled={controller.isGenerating}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {controller.isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t('doctor.consultationScribe.scribe.regenerate')}
            </button>
            <button
              type="button"
              onClick={() => setShowTranscriptEditor((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t('doctor.consultationScribe.scribe.editTranscript')}
            </button>
          </div>

          {showTranscriptEditor ? (
            <div className="mt-3">
              <textarea
                rows={6}
                value={transcriptDraft}
                onChange={(event) => setTranscriptDraft(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() =>
                  void controller.regenerate({
                    promptTemplate: template,
                    outputLanguage,
                    customInstructions: customInstructions.trim() || null,
                    transcriptOverride: transcriptDraft.trim() || null,
                  })
                }
                disabled={controller.isGenerating}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <Wand2 className="h-4 w-4" />
                {t('doctor.consultationScribe.scribe.regenerateFromTranscript')}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
