// Side-effect imports run in order: polyfills and WebRTC globals must be in
// place before Expo Router mounts the app.
import './src/lib/polyfills';
import './src/lib/livekit-globals';
import 'expo-router/entry';
