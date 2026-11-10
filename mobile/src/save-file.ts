import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SAVE_FILE_TYPES, type SaveFileRequest } from './save-file-message';

/**
 * Writes the file into the app's cache folder (the phone clears it when it needs space)
 * and opens the share sheet, where the patient can save it to Files, print it or send it.
 */
export async function saveAndShareFile(request: SaveFileRequest): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  const folder = new Directory(Paths.cache, 'ceenaix-downloads');
  folder.create({ intermediates: true, idempotent: true });

  const file = new File(folder, request.fileName);
  if (file.exists) file.delete();
  await file.write(request.base64, { encoding: 'base64' });

  const { mimeType, uti } = SAVE_FILE_TYPES[request.extension];
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: request.fileName });
}
