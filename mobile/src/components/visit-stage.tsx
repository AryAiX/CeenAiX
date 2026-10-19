import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
} from '@livekit/react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { ConnectionState, LocalVideoTrack, Track } from 'livekit-client';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Avatar, Icon, Text, type IconName } from '@/components/ui';
import type { TelemedicineTokenResponse } from '@/data/web/lib/telemedicine';
import { haptics } from '@/lib/haptics';
import { radius, spacing } from '@/theme/tokens';

// Imported only when the WebRTC native module exists (dev / store builds);
// see `app/(app)/visit/[id].tsx` and `lib/livekit-globals.ts`.

const CALL_BG = '#0B1220';
const CONTROL_BG = 'rgba(255,255,255,0.16)';
const DANGER = '#E5484D';
const WHITE = '#FFFFFF';

function ControlButton({
  icon,
  label,
  onPress,
  active = true,
  danger = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
}): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.control,
        { backgroundColor: danger ? DANGER : active ? CONTROL_BG : WHITE, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} size={26} color={danger || active ? WHITE : CALL_BG} />
    </Pressable>
  );
}

function RoomView({ counterpartName, onLeave }: { counterpartName: string; onLeave: () => void }): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const room = useRoomContext();
  const connection = useConnectionState();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false }).filter(isTrackReference);
  const remote = tracks.find((track) => !track.participant.isLocal);
  const local = tracks.find((track) => track.participant.isLocal);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');

  const flipCamera = async () => {
    const track = localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (!(track instanceof LocalVideoTrack)) return;
    const next = facing === 'user' ? 'environment' : 'user';
    await track.restartTrack({ facingMode: next });
    setFacing(next);
  };

  const leave = () => {
    void room.disconnect();
    onLeave();
  };

  const status =
    connection === ConnectionState.Connecting
      ? t('m.visit.connecting')
      : connection === ConnectionState.Reconnecting || connection === ConnectionState.SignalReconnecting
        ? t('m.visit.reconnecting')
        : !remote
          ? t('m.visit.waiting', { name: counterpartName })
          : null;

  return (
    <View style={[styles.flex, { backgroundColor: CALL_BG }]}>
      {remote ? (
        <VideoTrack trackRef={remote} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Avatar name={counterpartName} size={96} />
        </View>
      )}

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text variant="heading" style={{ color: WHITE }} numberOfLines={1}>
          {counterpartName}
        </Text>
        {status ? (
          <Text variant="caption" style={{ color: WHITE, opacity: 0.8 }}>
            {status}
          </Text>
        ) : null}
      </View>

      {local && isCameraEnabled ? (
        <View style={[styles.pip, { top: insets.top + 72 }]}>
          <VideoTrack trackRef={local} style={StyleSheet.absoluteFill} objectFit="cover" mirror={facing === 'user'} />
        </View>
      ) : null}

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <ControlButton
          icon={isMicrophoneEnabled ? 'mic' : 'mic-off'}
          label={isMicrophoneEnabled ? t('m.visit.mute') : t('m.visit.unmute')}
          active={isMicrophoneEnabled}
          onPress={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        />
        <ControlButton
          icon={isCameraEnabled ? 'videocam' : 'videocam-off'}
          label={isCameraEnabled ? t('m.visit.cameraOff') : t('m.visit.cameraOn')}
          active={isCameraEnabled}
          onPress={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
        />
        <ControlButton icon="camera-reverse" label={t('m.visit.flip')} onPress={() => void flipCamera()} />
        <ControlButton icon="call" label={t('m.visit.leave')} danger onPress={leave} />
      </View>
    </View>
  );
}

export function VisitStage({
  session,
  counterpartName,
  onLeave,
  onError,
}: {
  session: TelemedicineTokenResponse;
  counterpartName: string;
  onLeave: () => void;
  onError: (message: string) => void;
}): React.ReactElement {
  useKeepAwake();

  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <LiveKitRoom
      serverUrl={session.serverUrl}
      token={session.token}
      connect
      audio
      video
      options={{ adaptiveStream: { pixelDensity: 'screen' }, dynacast: true }}
      onDisconnected={onLeave}
      onError={(error) => onError(error.message)}
    >
      <RoomView counterpartName={counterpartName} onLeave={onLeave} />
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  placeholder: { position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, alignItems: 'center', justifyContent: 'center' },
  header: { position: 'absolute', top: 0, start: 0, end: 0, paddingHorizontal: spacing.lg, gap: 2 },
  pip: { position: 'absolute', end: spacing.lg, width: 108, height: 152, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#1F2937' },
  controls: { position: 'absolute', bottom: 0, start: 0, end: 0, flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, paddingTop: spacing.lg },
  control: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
