import * as Crypto from 'expo-crypto';
import 'react-native-url-polyfill/auto';

// Shared web code (generated data layer) calls `crypto.randomUUID()` for
// storage paths; Hermes has no Web Crypto, so back it with expo-crypto.
const globalWithCrypto = globalThis as { crypto?: { randomUUID?: () => string } };
if (!globalWithCrypto.crypto) globalWithCrypto.crypto = {};
if (!globalWithCrypto.crypto.randomUUID) globalWithCrypto.crypto.randomUUID = () => Crypto.randomUUID();
