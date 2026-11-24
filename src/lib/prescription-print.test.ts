import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { jsPDF } from 'jspdf';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { savePdf } from './save-file';
import {
  downloadPrescriptionPdf,
  escapeHtml,
  prescriptionPrintHtml,
  printPrescription,
  type PrescriptionPrintContent,
} from './prescription-print';

vi.mock('./save-file', () => ({ savePdf: vi.fn() }));

const fontFile = (name: string) => readFileSync(resolve(__dirname, '../assets/fonts', name));

const content = (overrides: Partial<PrescriptionPrintContent> = {}): PrescriptionPrintContent => ({
  language: 'en',
  brand: 'CeenAiX Health Platform',
  title: 'Prescription',
  details: [
    { label: 'Patient', value: 'Demo <Patient>' },
    { label: 'Prescription ID', value: 'abcd1234' },
  ],
  medicationsHeading: 'Prescribed medications',
  quantityLabel: 'Quantity',
  instructionsLabel: 'Instructions',
  items: [{ name: 'Amoxicillin', detail: '500 mg • Three times daily', quantity: '21', instructions: 'After food' }],
  disclaimer: 'Always check with the prescribing doctor.',
  footerNote: 'Confidential',
  pageLabel: (page, total) => `Page ${page} of ${total}`,
  fileName: 'prescription-abcd1234',
  ...overrides,
});

describe('prescription print layout (QA-137)', () => {
  it('escapes text and contains only the prescription', () => {
    const html = prescriptionPrintHtml(content());
    expect(html).toContain('Demo &lt;Patient&gt;');
    expect(html).not.toContain('<Patient>');
    expect(html).toContain('Amoxicillin');
    expect(html).toContain('Quantity: <bdi>21</bdi>');
    expect(escapeHtml(`"a" & 'b'`)).toBe('&quot;a&quot; &amp; &#39;b&#39;');
  });

  it('lays the page out right to left in Arabic', () => {
    const html = prescriptionPrintHtml(content({ language: 'ar', title: 'وصفة طبية' }));
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('وصفة طبية');
    const withLatin = prescriptionPrintHtml(
      content({ language: 'ar', items: [{ name: 'أموكسيسيلين', secondaryName: 'amoxicillin', detail: '٥٠٠ ملغ' }] })
    );
    expect(withLatin).toContain('<div class="secondary"><bdi dir="ltr">amoxicillin</bdi></div>');
  });

  it('prints from a hidden frame instead of the whole page', () => {
    const pagePrint = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    printPrescription(content());
    const frame = document.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame?.srcdoc).toContain('Amoxicillin');
    const framePrint = vi.fn();
    Object.defineProperty(frame, 'contentWindow', {
      value: { print: framePrint, focus: vi.fn(), addEventListener: vi.fn() },
    });
    frame?.onload?.(new Event('load'));
    expect(framePrint).toHaveBeenCalledTimes(1);
    expect(pagePrint).not.toHaveBeenCalled();
    frame?.remove();
  });
});

describe('prescription PDF (QA-137)', () => {
  beforeEach(() => {
    vi.mocked(savePdf).mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const bytes = fontFile(String(url).includes('Bold') ? 'IBMPlexSansArabic-Bold.ttf' : 'IBMPlexSansArabic-Regular.ttf');
        return new Response(bytes);
      })
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const savedPdf = () => vi.mocked(savePdf).mock.calls[0][0] as jsPDF;

  it('keeps one page for a short prescription', async () => {
    await downloadPrescriptionPdf(content());
    expect(savePdf).toHaveBeenCalledWith(expect.anything(), 'prescription-abcd1234');
    expect(savedPdf().getNumberOfPages()).toBe(1);
  });

  it('adds pages instead of running into the footer when there are many medicines', async () => {
    const items = Array.from({ length: 14 }, (_, index) => ({
      name: `Medicine ${index + 1}`,
      detail: '500 mg • Three times daily • 7 days',
      instructions: 'Take after food with a full glass of water. '.repeat(4),
    }));
    await downloadPrescriptionPdf(content({ items }));
    expect(savedPdf().getNumberOfPages()).toBeGreaterThan(1);
  });
});
