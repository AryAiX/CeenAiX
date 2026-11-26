import { afterEach, describe, expect, it, vi } from 'vitest';
import { csvCell, downloadCsv, toCsv } from './csv-export';

describe('csv-export (QA-270)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('quotes cells with commas, quotes and line breaks', () => {
    expect(csvCell('Amoxicillin, 500 mg')).toBe('"Amoxicillin, 500 mg"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(true)).toBe('true');
  });

  it('stops text from running as a spreadsheet formula, but keeps numbers as numbers', () => {
    expect(csvCell('=HYPERLINK("http://x","click")')).toBe(`"'=HYPERLINK(""http://x"",""click"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell(-2)).toBe('-2');
    expect(csvCell(Number.NaN)).toBe('');
  });

  it('uses the line endings Excel expects', () => {
    expect(toCsv([['a', 1], ['b', 2]])).toBe('a,1\r\nb,2');
  });

  it('starts the file with a byte order mark so Excel reads Arabic correctly', async () => {
    // jsdom has no object URLs: stand-ins that keep the file.
    let saved: Blob | null = null;
    const create = vi.fn((blob: Blob) => {
      saved = blob;
      return 'blob:test';
    });
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadCsv('stock.csv', [['name'], ['أموكسيسيلين']]);

    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:test');
    const file = saved as unknown as Blob;
    const bytes = new Uint8Array(
      await new Promise<ArrayBuffer>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
      })
    );
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('name\r\nأموكسيسيلين');
  });
});
