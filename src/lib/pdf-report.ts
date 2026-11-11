import { jsPDF } from 'jspdf';
import boldFontUrl from '../assets/fonts/IBMPlexSansArabic-Bold.ttf?url';
import regularFontUrl from '../assets/fonts/IBMPlexSansArabic-Regular.ttf?url';

/**
 * Builds patient PDFs (lab reports, document summaries) that work in English and Arabic (QA-069).
 *
 * - Font: IBM Plex Sans Arabic (SIL Open Font License, see src/assets/fonts/IBMPlexSansArabic-OFL.txt).
 *   It has Arabic and English letters, so Arabic names print correctly in either language.
 *   It is only downloaded when a patient saves a PDF, so pages don't load any slower.
 * - Layout: positions are written for left-to-right and mirrored when the PDF is in Arabic.
 * - Text: a line with Arabic letters is shaped and ordered like the page does with dir="auto" (its first
 *   Arabic or English letter decides the direction); lines without Arabic are drawn as they are.
 *   Keep numbers, ranges and codes in their own text() call (see labelValue), so they are never flipped.
 */

export const PDF_FONT_FAMILY = 'IBMPlexSansArabic';
const FALLBACK_FONT_FAMILY = 'helvetica';

const ARABIC_LETTERS = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const LATIN_LETTERS = /[A-Za-z]/;

/** jsPDF's built-in bidi options for a line with Arabic letters (brackets mirrored correctly). */
const BIDI_TEXT_OPTIONS = {
  isInputVisual: false,
  isOutputVisual: true,
  isOutputRtl: false,
  isSymmetricSwapping: true,
};

export const hasArabicLetters = (value: string): boolean => ARABIC_LETTERS.test(value);

/** Like dir="auto" on the page: the first Arabic or English letter decides the line's direction. */
export function startsRightToLeft(value: string): boolean {
  const arabic = value.search(ARABIC_LETTERS);
  if (arabic < 0) return false;
  const latin = value.search(LATIN_LETTERS);
  return latin < 0 || arabic < latin;
}

interface PdfFontData {
  regular: string;
  bold: string;
}

let fontDataPromise: Promise<PdfFontData | null> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

async function fetchFontBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load the PDF font (${response.status}).`);
  return arrayBufferToBase64(await response.arrayBuffer());
}

/** Loads the font once per visit. If it can't load (offline), PDFs fall back to the built-in English-only font. */
function loadPdfFonts(): Promise<PdfFontData | null> {
  fontDataPromise ??= Promise.all([fetchFontBase64(regularFontUrl), fetchFontBase64(boldFontUrl)])
    .then(([regular, bold]) => ({ regular, bold }))
    .catch(() => {
      fontDataPromise = null;
      return null;
    });
  return fontDataPromise;
}

type Align = 'left' | 'right' | 'center';
type Weight = 'normal' | 'bold';

export interface PdfReport {
  doc: jsPDF;
  rtl: boolean;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  setWeight: (weight: Weight) => void;
  /** x is measured from the left in English and mirrored in Arabic; align follows the same rule. */
  text: (value: string | string[], x: number, y: number, options?: { align?: Align; lineHeight?: number }) => void;
  /** Draws "Label: value" starting at x, with the value in its own call so numbers and codes keep their order. */
  labelValue: (label: string, value: string, x: number, y: number) => void;
  rect: (x: number, y: number, width: number, height: number, style?: string) => void;
  roundedRect: (x: number, y: number, width: number, height: number, radius: number, style?: string) => void;
  line: (x1: number, y: number, x2: number) => void;
  textWidth: (value: string) => number;
  splitLines: (value: string, maxWidth: number) => string[];
  /** Shortens one line with "…" so it fits in maxWidth. */
  fitLine: (value: string, maxWidth: number) => string;
}

export async function createPdfReport(language: string): Promise<PdfReport> {
  const doc = new jsPDF();
  const rtl = language.toLowerCase().startsWith('ar');
  const fonts = await loadPdfFonts();
  let family = FALLBACK_FONT_FAMILY;
  if (fonts) {
    doc.addFileToVFS('IBMPlexSansArabic-Regular.ttf', fonts.regular);
    doc.addFont('IBMPlexSansArabic-Regular.ttf', PDF_FONT_FAMILY, 'normal');
    doc.addFileToVFS('IBMPlexSansArabic-Bold.ttf', fonts.bold);
    doc.addFont('IBMPlexSansArabic-Bold.ttf', PDF_FONT_FAMILY, 'bold');
    family = PDF_FONT_FAMILY;
  }
  doc.setFont(family, 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const mirrorX = (x: number) => (rtl ? pageWidth - x : x);
  const mirrorAlign = (align: Align): Align => (!rtl || align === 'center' ? align : align === 'left' ? 'right' : 'left');
  const directionOptions = (value: string) =>
    fonts && hasArabicLetters(value) ? { ...BIDI_TEXT_OPTIONS, isInputRtl: startsRightToLeft(value) } : {};
  const textWidth = (value: string) => doc.getTextWidth(value);

  const report: PdfReport = {
    doc,
    rtl,
    pageWidth,
    pageHeight,
    margin,
    setWeight: (weight) => doc.setFont(family, weight),
    text: (value, x, y, options = {}) => {
      const lines = Array.isArray(value) ? value : [value];
      const lineHeight = options.lineHeight ?? 5;
      lines.forEach((line, index) => {
        doc.text(line, mirrorX(x), y + index * lineHeight, {
          align: mirrorAlign(options.align ?? 'left'),
          ...directionOptions(line),
        });
      });
    },
    labelValue: (label, value, x, y) => {
      const prefix = `${label}:`;
      report.text(prefix, x, y);
      report.text(value, x + textWidth(prefix) + 1.5, y);
    },
    rect: (x, y, width, height, style = 'F') => {
      doc.rect(rtl ? pageWidth - x - width : x, y, width, height, style);
    },
    roundedRect: (x, y, width, height, radius, style = 'F') => {
      doc.roundedRect(rtl ? pageWidth - x - width : x, y, width, height, radius, radius, style);
    },
    line: (x1, y, x2) => doc.line(x1, y, x2, y),
    textWidth,
    splitLines: (value, maxWidth) => doc.splitTextToSize(value, maxWidth) as string[],
    fitLine: (value, maxWidth) => {
      if (textWidth(value) <= maxWidth) return value;
      let shortened = value;
      while (shortened.length > 1 && textWidth(`${shortened}…`) > maxWidth) shortened = shortened.slice(0, -1);
      return `${shortened.trimEnd()}…`;
    },
  };
  return report;
}

/** Teal header bar with the platform name and the report title. */
export function drawPdfHeader(report: PdfReport, brand: string, title: string): void {
  const { doc, pageWidth, margin } = report;
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  report.setWeight('bold');
  report.text(brand, margin, 9);
  doc.setFontSize(9);
  report.setWeight('normal');
  report.text(title, pageWidth - margin, 9, { align: 'right' });
}

/** Light footer on every page with the confidentiality note and "Page x of y". */
export function drawPdfFooters(report: PdfReport, note: string, pageLabel: (page: number, total: number) => string): void {
  const { doc, pageWidth, pageHeight, margin } = report;
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setFontSize(7);
    report.setWeight('normal');
    doc.setTextColor(148, 163, 184);
    report.text(note, margin, pageHeight - 3);
    report.text(pageLabel(page, total), pageWidth - margin, pageHeight - 3, { align: 'right' });
  }
}
