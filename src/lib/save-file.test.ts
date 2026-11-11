import { afterEach, describe, expect, it, vi } from 'vitest';
import { SAVE_FILE_MESSAGE_TYPE, saveTextFile, withFileExtension } from './save-file';

afterEach(() => {
  delete window.ReactNativeWebView;
  vi.restoreAllMocks();
});

describe('saveTextFile', () => {
  it('hands the file to the phone app instead of downloading it (QA-096)', async () => {
    const postMessage = vi.fn();
    window.ReactNativeWebView = { postMessage };
    const createObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL });

    await saveTextFile('BEGIN:VCALENDAR', 'appointment-1.ics', 'text/calendar');

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledTimes(1);
    const message = JSON.parse(postMessage.mock.calls[0][0] as string);
    expect(message).toEqual({
      type: SAVE_FILE_MESSAGE_TYPE,
      fileName: 'appointment-1.ics',
      base64: btoa('BEGIN:VCALENDAR'),
    });
  });

  it('downloads normally in a browser', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await saveTextFile('hello', 'summary.txt', 'text/plain');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('summary.txt');
  });
});

describe('withFileExtension', () => {
  it('keeps a matching extension and replaces a different one', () => {
    expect(withFileExtension('lab-report.pdf', 'pdf')).toBe('lab-report.pdf');
    expect(withFileExtension('Scan.JPG', 'pdf')).toBe('Scan.pdf');
    expect(withFileExtension('report', 'pdf')).toBe('report.pdf');
    expect(withFileExtension('.pdf', 'pdf')).toBe('.pdf');
    expect(withFileExtension('', 'pdf')).toBe('ceenaix-file.pdf');
  });
});
