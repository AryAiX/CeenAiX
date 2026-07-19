import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import type { TelemedicineTokenResponse } from '../../lib/telemedicine';

interface LiveKitStageProps {
  session: TelemedicineTokenResponse;
  onDisconnected: () => void;
  onError: (message: string) => void;
}

export default function LiveKitStage({ session, onDisconnected, onError }: LiveKitStageProps) {
  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.serverUrl}
      connect
      video
      audio
      data-lk-theme="default"
      className="min-h-[calc(100vh-9.5rem)] overflow-hidden rounded-2xl bg-slate-950"
      onDisconnected={onDisconnected}
      onError={(error) => onError(error.message)}
    >
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
