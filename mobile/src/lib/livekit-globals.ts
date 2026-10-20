import { NativeModules, TurboModuleRegistry } from 'react-native';

// `@livekit/react-native-webrtc` needs its native module, which only exists in
// an Expo dev build / store build (not Expo Go). Probing first keeps the rest
// of the app usable in Expo Go; the video visit screen explains the
// requirement when the module is missing.
export const isWebRtcAvailable = (): boolean => {
  try {
    return Boolean(TurboModuleRegistry.get('WebRTCModule') ?? NativeModules.WebRTCModule);
  } catch {
    return false;
  }
};

if (isWebRtcAvailable()) {
  const livekit = require('@livekit/react-native') as typeof import('@livekit/react-native');
  livekit.registerGlobals();
}
