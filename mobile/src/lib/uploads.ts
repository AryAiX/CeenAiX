import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface LocalAsset {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export const safeFileName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'document';

export const extensionFor = (mimeType: string, fallback = 'jpg'): string => {
  const ext = mimeType.split('/')[1]?.split(';')[0]?.trim().toLowerCase();
  if (!ext) return fallback;
  return ext === 'jpeg' ? 'jpg' : ext;
};

export const randomId = (): string => Crypto.randomUUID();

export async function readAssetBytes(uri: string): Promise<ArrayBuffer> {
  // Web pickers return blob:/data: URIs; expo-file-system is native-only.
  if (Platform.OS === 'web') return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

export async function uploadToBucket(
  bucket: 'documents' | 'avatars' | 'medical-files',
  path: string,
  asset: Pick<LocalAsset, 'uri' | 'mimeType'>,
  options: { upsert?: boolean } = {}
): Promise<void> {
  const bytes = await readAssetBytes(asset.uri);
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: asset.mimeType,
    cacheControl: '3600',
    upsert: options.upsert ?? false,
  });
  if (error) throw error;
}
