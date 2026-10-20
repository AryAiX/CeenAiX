import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { extensionFor, type LocalAsset } from './uploads';

export type AssetSource = 'camera' | 'library' | 'files';

export class PermissionDeniedError extends Error {
  constructor(public readonly source: AssetSource) {
    super(`permission-denied:${source}`);
  }
}

const fromImage = (asset: ImagePicker.ImagePickerAsset, prefix: string): LocalAsset => {
  const mimeType = asset.mimeType ?? 'image/jpeg';
  return {
    uri: asset.uri,
    name: asset.fileName ?? `${prefix}-${Date.now()}.${extensionFor(mimeType)}`,
    mimeType,
    size: asset.fileSize ?? 0,
  };
};

const withSize = (asset: LocalAsset): LocalAsset => {
  if (asset.size > 0 || Platform.OS === 'web') return asset;
  try {
    return { ...asset, size: new File(asset.uri).size ?? 0 };
  } catch {
    return asset;
  }
};

/**
 * Opens the camera, photo library or document picker and returns one local
 * asset, or `null` when the patient cancels.
 */
export async function pickAsset(
  source: AssetSource,
  options: {
    documentTypes?: string[];
    aspect?: [number, number];
    allowsEditing?: boolean;
  } = {}
): Promise<LocalAsset | null> {
  if (source === 'files') {
    const result = await DocumentPicker.getDocumentAsync({
      type: options.documentTypes ?? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return null;
    return withSize({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size ?? 0,
    });
  }

  const imageOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: options.allowsEditing ?? false,
    aspect: options.aspect,
  };

  if (source === 'camera' && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new PermissionDeniedError('camera');
    const result = await ImagePicker.launchCameraAsync(imageOptions);
    const asset = result.canceled ? null : result.assets[0];
    return asset ? withSize(fromImage(asset, 'photo')) : null;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new PermissionDeniedError('library');
  const result = await ImagePicker.launchImageLibraryAsync(imageOptions);
  const asset = result.canceled ? null : result.assets[0];
  return asset ? withSize(fromImage(asset, 'image')) : null;
}
