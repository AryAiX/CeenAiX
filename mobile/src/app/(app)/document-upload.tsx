import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, ChoiceChips, IconBadge, InlineMessage, ListRow, Screen, StickyFooter, Text, TextField, ToggleRow, SheetTitle } from '@/components/ui';
import { DOCUMENT_MAX_BYTES, UPLOAD_CATEGORIES, uploadVaultDocument } from '@/data/documents';
import type { PatientVaultDocumentCategory } from '@/data/web/hooks/use-patient-document-vault';
import { formatBytes } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { PermissionDeniedError, pickAsset, type AssetSource } from '@/lib/pick-asset';
import type { LocalAsset } from '@/lib/uploads';
import { useAuth } from '@/providers/auth-provider';
import { radius, spacing } from '@/theme/tokens';
import { errorMessage } from '@/lib/errors';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

export default function DocumentUploadSheet(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [asset, setAsset] = useState<LocalAsset | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PatientVaultDocumentCategory>('upload');
  const [careTeam, setCareTeam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    message: string;
    settings?: boolean;
  } | null>(null);

  const choose = async (source: AssetSource) => {
    setError(null);
    try {
      const picked = await pickAsset(source);
      if (!picked) return;
      if (picked.size > DOCUMENT_MAX_BYTES) {
        haptics.error();
        setError({
          message: t('m.docs.tooLarge', {
            size: formatBytes(DOCUMENT_MAX_BYTES),
          }),
        });
        return;
      }
      haptics.tap();
      setAsset(picked);
      if (!title) setTitle(picked.name.replace(/\.[a-z0-9]+$/i, ''));
    } catch (pickError) {
      if (pickError instanceof PermissionDeniedError) {
        setError({
          message: pickError.source === 'camera' ? t('m.docs.permissionCamera') : t('m.docs.permissionLibrary'),
          settings: true,
        });
      } else {
        setError({
          message: errorMessage(pickError, t('m.common.unexpected')),
        });
      }
    }
  };

  const submit = async () => {
    if (!user || !asset) return;
    setBusy(true);
    setError(null);
    try {
      await uploadVaultDocument({
        patientId: user.id,
        asset,
        title,
        description,
        category,
        allowCareTeamAccess: careTeam,
      });
      haptics.success();
      router.back();
    } catch (uploadError) {
      haptics.error();
      setError({
        message: errorMessage(uploadError, t('m.common.unexpected')),
      });
      setBusy(false);
    }
  };

  return (
    <Screen
      testID="screen-document-upload"
      keyboard
      footer={
        <StickyFooter>
          <Button
            testID="btn-save-document"
            label={busy ? t('m.docs.uploading') : t('m.docs.save')}
            icon="cloud-upload-outline"
            size="lg"
            fullWidth
            loading={busy}
            disabled={!asset || busy}
            onPress={() => void submit()}
          />
        </StickyFooter>
      }
    >
      <SheetTitle title={t('m.docs.uploadTitle')} />
      <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
        {asset ? (
          <Card testID="card-selected-file">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              {asset.mimeType.startsWith('image/') ? (
                <Image source={{ uri: asset.uri }} style={{ width: 64, height: 64, borderRadius: radius.md }} contentFit="cover" />
              ) : (
                <IconBadge name="document-text-outline" tone="warning" size={64} />
              )}
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {asset.name}
                </Text>
                <Text variant="caption" color="muted">
                  {formatBytes(asset.size)}
                </Text>
              </View>
            </View>
            <Button testID="btn-replace-file" label={t('m.docs.replace')} variant="ghost" size="sm" onPress={() => setAsset(null)} />
          </Card>
        ) : (
          <Card padded={false}>
            <View style={{ paddingHorizontal: spacing.lg }}>
              {Platform.OS === 'web' ? null : (
                <ListRow testID="btn-pick-camera" title={t('m.docs.camera')} icon="camera-outline" onPress={() => void choose('camera')} />
              )}
              <ListRow testID="btn-pick-library" title={t('m.docs.library')} icon="images-outline" iconTone="ai" onPress={() => void choose('library')} />
              <ListRow testID="btn-pick-files" title={t('m.docs.files')} icon="document-attach-outline" iconTone="info" onPress={() => void choose('files')} />
            </View>
          </Card>
        )}

        {error ? (
          <View style={{ gap: spacing.sm }}>
            <InlineMessage tone="danger" message={error.message} />
            {error.settings && Platform.OS !== 'web' ? (
              <Button label={t('nav.settings')} variant="ghost" size="sm" onPress={() => void Linking.openSettings()} />
            ) : null}
          </View>
        ) : null}

        <TextField testID="input-document-title" label={t('m.docs.titleLabel')} value={title} onChangeText={setTitle} maxLength={160} />
        <TextField
          testID="input-document-description"
          label={t('m.docs.descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={1000}
        />
        <View style={{ gap: 6 }}>
          <Text variant="captionStrong" color="muted">
            {t('m.docs.category')}
          </Text>
          <ChoiceChips<PatientVaultDocumentCategory>
            testID="chip-document-category"
            options={UPLOAD_CATEGORIES.map((value) => ({
              value,
              label: t(`m.docs.categories.${value}`),
            }))}
            selected={[category]}
            onToggle={setCategory}
          />
        </View>
        <ToggleRow
          testID="toggle-document-care-team"
          label={t('m.docs.careTeam')}
          description={t('m.docs.careTeamHint')}
          value={careTeam}
          onChange={setCareTeam}
        />
      </View>
    </Screen>
  );
}
