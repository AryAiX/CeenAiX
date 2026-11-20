import { createPdfReport, drawPdfFooters, drawPdfHeader } from './pdf-report';
import { savePdf } from './save-file';

/**
 * QA-137: one prescription layout for both "Print now" and "Download PDF".
 *
 * - Print: renders only the prescription in a hidden frame and opens the browser print window
 *   (window.print() on the page printed the whole screen behind the dialog).
 * - PDF: uses the shared Arabic-capable PDF builder (QA-069), wraps long text and starts a new
 *   page when the medicines don't fit, instead of running into the footer.
 *
 * All text arrives already translated, so this file has no language logic of its own.
 */

export interface PrescriptionPrintItem {
  /** Name shown first (the Arabic name in Arabic when there is one). */
  name: string;
  /** Second line, e.g. the canonical Latin name when the first line is Arabic. */
  secondaryName?: string | null;
  /** Dose, frequency and duration, already joined and translated. */
  detail: string;
  quantity?: string | null;
  instructions?: string | null;
}

export interface PrescriptionPrintContent {
  language: string;
  brand: string;
  title: string;
  /** Patient name, date, doctor, licence, prescription ID. */
  details: Array<{ label: string; value: string }>;
  medicationsHeading: string;
  quantityLabel: string;
  instructionsLabel: string;
  items: PrescriptionPrintItem[];
  disclaimer: string;
  footerNote: string;
  pageLabel: (page: number, total: number) => string;
  fileName: string;
}

const isRtl = (language: string) => language.toLowerCase().startsWith('ar');

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function prescriptionPrintHtml(content: PrescriptionPrintContent): string {
  const dir = isRtl(content.language) ? 'rtl' : 'ltr';
  const details = content.details
    .map(
      (row) =>
        `<div class="row"><span class="label">${escapeHtml(row.label)}:</span> <bdi>${escapeHtml(row.value)}</bdi></div>`
    )
    .join('');
  const items = content.items
    .map((item, index) => {
      const lines = [
        `<div class="name"><bdi>${index + 1}. ${escapeHtml(item.name)}</bdi></div>`,
        item.secondaryName ? `<div class="secondary"><bdi dir="ltr">${escapeHtml(item.secondaryName)}</bdi></div>` : '',
        `<div class="detail"><bdi>${escapeHtml(item.detail)}</bdi></div>`,
        item.quantity
          ? `<div class="detail">${escapeHtml(content.quantityLabel)}: <bdi>${escapeHtml(item.quantity)}</bdi></div>`
          : '',
        item.instructions
          ? `<div class="detail">${escapeHtml(content.instructionsLabel)}: <bdi>${escapeHtml(item.instructions)}</bdi></div>`
          : '',
      ];
      return `<li class="item">${lines.join('')}</li>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(content.language)}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(content.title)}</title>
<style>
  @page { margin: 16mm; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif; color: #0f172a; margin: 0; }
  .brand { background: #0d9488; color: #fff; padding: 8px 12px; font-weight: 700; display: flex; justify-content: space-between; }
  h1 { font-size: 20px; margin: 18px 0 10px; }
  .row { font-size: 13px; color: #475569; margin: 3px 0; }
  .label { font-weight: 600; color: #0f172a; }
  h2 { font-size: 14px; margin: 18px 0 8px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  ol { list-style: none; padding: 0; margin: 0; }
  .item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; break-inside: avoid; }
  .name { font-weight: 700; font-size: 14px; }
  .secondary { font-size: 12px; color: #64748b; }
  .detail { font-size: 12px; color: #475569; margin-top: 3px; overflow-wrap: anywhere; }
  .disclaimer { font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 16px; }
  .footer { font-size: 10px; color: #94a3b8; margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
</style>
</head>
<body>
<div class="brand"><span>${escapeHtml(content.brand)}</span><span>${escapeHtml(content.title)}</span></div>
<h1>${escapeHtml(content.title)}</h1>
${details}
<h2>${escapeHtml(content.medicationsHeading)}</h2>
<ol>${items}</ol>
<p class="disclaimer">${escapeHtml(content.disclaimer)}</p>
<div class="footer">${escapeHtml(content.footerNote)}</div>
</body>
</html>`;
}

/** Prints only the prescription: it is rendered in a hidden frame, printed, then removed. */
export function printPrescription(content: PrescriptionPrintContent): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    frame.remove();
  };

  frame.onload = () => {
    const printWindow = frame.contentWindow;
    if (!printWindow) {
      remove();
      return;
    }
    printWindow.addEventListener('afterprint', () => window.setTimeout(remove, 0), { once: true });
    printWindow.focus();
    printWindow.print();
    // Some browsers never send afterprint; don't leave the frame behind.
    window.setTimeout(remove, 60_000);
  };
  frame.srcdoc = prescriptionPrintHtml(content);
  document.body.appendChild(frame);
}

const ITEM_PADDING = 4;
const LINE_HEIGHT = 5;
const FOOTER_SPACE = 18;
const TOP_AFTER_HEADER = 24;

/** Builds and saves the prescription PDF, wrapping long text and adding pages when needed. */
export async function downloadPrescriptionPdf(content: PrescriptionPrintContent): Promise<void> {
  const report = await createPdfReport(content.language);
  const { doc, pageWidth, pageHeight, margin } = report;
  const contentWidth = pageWidth - margin * 2;
  const textWidth = contentWidth - ITEM_PADDING * 2;

  const newPage = () => {
    doc.addPage();
    drawPdfHeader(report, content.brand, content.title);
    return TOP_AFTER_HEADER;
  };
  const ensureSpace = (y: number, needed: number) => (y + needed > pageHeight - FOOTER_SPACE ? newPage() : y);

  drawPdfHeader(report, content.brand, content.title);
  let y = 26;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  report.setWeight('bold');
  report.text(content.title, margin, y);
  y += 9;

  doc.setFontSize(10);
  for (const row of content.details) {
    report.setWeight('bold');
    doc.setTextColor(15, 23, 42);
    const label = `${row.label}:`;
    report.text(label, margin, y);
    report.setWeight('normal');
    doc.setTextColor(71, 85, 105);
    const valueX = margin + report.textWidth(label) + 2;
    report.text(report.fitLine(row.value, contentWidth - (valueX - margin)), valueX, y);
    y += 6;
  }

  y += 2;
  doc.setDrawColor(226, 232, 240);
  report.line(margin, y, pageWidth - margin);
  y += 9;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  report.setWeight('bold');
  report.text(content.medicationsHeading, margin, y);
  y += 8;

  content.items.forEach((item, index) => {
    doc.setFontSize(11);
    report.setWeight('bold');
    const nameLines = report.splitLines(`${index + 1}. ${item.name}`, textWidth);
    doc.setFontSize(9);
    report.setWeight('normal');
    const secondaryLines = item.secondaryName ? report.splitLines(item.secondaryName, textWidth) : [];
    const detailLines = report.splitLines(item.detail, textWidth);
    const quantityLines = item.quantity ? report.splitLines(`${content.quantityLabel}: ${item.quantity}`, textWidth) : [];
    const instructionLines = item.instructions
      ? report.splitLines(`${content.instructionsLabel}: ${item.instructions}`, textWidth)
      : [];
    const bodyLines = secondaryLines.length + detailLines.length + quantityLines.length + instructionLines.length;
    const boxHeight = ITEM_PADDING * 2 + nameLines.length * 5.5 + bodyLines * LINE_HEIGHT;

    y = ensureSpace(y, boxHeight + 4);

    doc.setFillColor(248, 250, 252);
    report.roundedRect(margin, y, contentWidth, boxHeight, 2);

    let lineY = y + ITEM_PADDING + 4;
    doc.setFontSize(11);
    report.setWeight('bold');
    doc.setTextColor(15, 23, 42);
    report.text(nameLines, margin + ITEM_PADDING, lineY, { lineHeight: 5.5 });
    lineY += nameLines.length * 5.5;

    doc.setFontSize(9);
    report.setWeight('normal');
    doc.setTextColor(100, 116, 139);
    for (const lines of [secondaryLines, detailLines, quantityLines, instructionLines]) {
      if (lines.length === 0) continue;
      report.text(lines, margin + ITEM_PADDING, lineY, { lineHeight: LINE_HEIGHT });
      lineY += lines.length * LINE_HEIGHT;
      doc.setTextColor(71, 85, 105);
    }

    y += boxHeight + 4;
  });

  doc.setFontSize(8);
  report.setWeight('normal');
  doc.setTextColor(148, 163, 184);
  const disclaimerLines = report.splitLines(content.disclaimer, contentWidth);
  y = ensureSpace(y + 4, disclaimerLines.length * 4 + 2);
  report.text(disclaimerLines, margin, y, { lineHeight: 4 });

  drawPdfFooters(report, content.footerNote, content.pageLabel);
  await savePdf(doc, content.fileName);
}
