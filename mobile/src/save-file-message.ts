/**
 * The web portal cannot save a file it creates in the page (a PDF, a calendar
 * file) inside the app: iOS drops the temporary `blob:` link. Instead the page
 * posts the file to the app with this message, and the app opens the share sheet.
 * This file only checks the message; it has no native code, so it is easy to test.
 */

export const SAVE_FILE_MESSAGE_TYPE = 'ceenaix:save-file';

/** Only these file types are accepted. The app decides the file type from the name, not from the page. */
export const SAVE_FILE_TYPES = {
  pdf: { mimeType: 'application/pdf', uti: 'com.adobe.pdf' },
  ics: { mimeType: 'text/calendar', uti: 'public.calendar-event' },
  txt: { mimeType: 'text/plain', uti: 'public.plain-text' },
} as const;

export type SaveFileExtension = keyof typeof SAVE_FILE_TYPES;

/** About 15 MB of file data once decoded. */
export const MAX_SAVE_FILE_BASE64_LENGTH = 20 * 1024 * 1024;

const MAX_FILE_NAME_LENGTH = 100;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export interface SaveFileRequest {
  fileName: string;
  extension: SaveFileExtension;
  base64: string;
}

/** Turns the page's message into a safe request, or null when the message is not a valid save-file request. */
export function parseSaveFileMessage(data: string): SaveFileRequest | null {
  let message: unknown;
  try {
    message = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof message !== 'object' || message === null) return null;
  const { type, fileName, base64 } = message as Record<string, unknown>;
  if (type !== SAVE_FILE_MESSAGE_TYPE || typeof fileName !== 'string' || typeof base64 !== 'string') return null;
  if (base64.length === 0 || base64.length > MAX_SAVE_FILE_BASE64_LENGTH || !BASE64_PATTERN.test(base64)) return null;

  // Keep only the last part of the name and plain characters, so the name can't point outside the app's folder.
  // A name with no plain characters left (for example an Arabic title) becomes "ceenaix-file".
  const baseName = fileName.split(/[\\/]/).pop() ?? '';
  const dot = baseName.lastIndexOf('.');
  if (dot < 0) return null;
  const extension = baseName.slice(dot + 1).toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(SAVE_FILE_TYPES, extension)) return null;
  const stem =
    baseName
      .slice(0, dot)
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^[.-]+|[.-]+$/g, '')
      .slice(0, MAX_FILE_NAME_LENGTH) || 'ceenaix-file';
  const safeName = `${stem}.${extension}`;

  return { fileName: safeName, extension: extension as SaveFileExtension, base64 };
}
