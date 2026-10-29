import AsyncStorage from '@react-native-async-storage/async-storage';

// Last-successful-fetch cache so screens render instantly (and offline) with
// the previous result while a fresh request runs. Scoped per user and wiped
// on sign-out; never used for writes.
const PREFIX = 'ceenaix.cache.v1.';

interface CacheEnvelope<T> {
  savedAt: string;
  value: T;
}

export async function readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as CacheEnvelope<T>) : null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    const envelope: CacheEnvelope<T> = { savedAt: new Date().toISOString(), value };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    // Cache is best-effort.
  }
}

export async function clearQueryCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((key) => key.startsWith(PREFIX));
  if (ours.length > 0) await AsyncStorage.multiRemove(ours);
}
