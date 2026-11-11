import type { jsPDF } from 'jspdf';

/**
 * Saves a file the page created (a PDF report, a calendar file, a text summary).
 *
 * In a browser this is a normal download. Inside the CeenAiX phone app, a download
 * from a temporary blob: link does nothing on iOS, so the file is handed to the app
 * instead, and the app opens the phone's share sheet (Save to Files, Print, send).
 * The app's side is mobile/src/save-file-message.ts, which accepts only .pdf, .ics and .txt.
 */

export const SAVE_FILE_MESSAGE_TYPE = 'ceenaix:save-file';

declare global {
  interface Window {
    /** Added by the phone app's web view. */
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

export function isInsideMobileApp(): boolean {
  return typeof window !== 'undefined' && typeof window.ReactNativeWebView?.postMessage === 'function';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(blob);
  });
}

/** Makes sure the name ends with the given extension (a PDF made from "scan.jpg" is saved as "scan.pdf"). */
export function withFileExtension(fileName: string, extension: string): string {
  const suffix = `.${extension}`;
  if (fileName.toLowerCase().endsWith(suffix)) return fileName;
  const dot = fileName.lastIndexOf('.');
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  return `${stem || 'ceenaix-file'}${suffix}`;
}

export async function saveFile(blob: Blob, fileName: string): Promise<void> {
  if (isInsideMobileApp()) {
    const base64 = await blobToBase64(blob);
    if (!base64) throw new Error('Could not read the file.');
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: SAVE_FILE_MESSAGE_TYPE, fileName, base64 }));
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function saveTextFile(text: string, fileName: string, mimeType: string): Promise<void> {
  return saveFile(new Blob([text], { type: `${mimeType};charset=utf-8` }), fileName);
}

export function savePdf(pdf: jsPDF, fileName: string): Promise<void> {
  return saveFile(pdf.output('blob'), withFileExtension(fileName, 'pdf'));
}
