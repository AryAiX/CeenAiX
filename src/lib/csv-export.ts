/**
 * QA-270: one way to build and download CSV files for the portals.
 *
 * - Starts with a byte order mark, so Excel opens Arabic (and other non-Latin) text correctly.
 * - Uses CRLF line endings, as Excel expects.
 * - Quotes cells that contain a comma, quote, or line break.
 * - Protects against spreadsheet formulas: a text cell that starts with = + - @ (or a tab or
 *   carriage return) gets a leading apostrophe, so Excel shows it as text instead of running it.
 *   Numbers are written as they are (a negative number stays a number).
 */
export type CsvCell = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export const csvCell = (value: CsvCell): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (rows: CsvCell[][]): string => rows.map((row) => row.map(csvCell).join(',')).join('\r\n');

const BYTE_ORDER_MARK = '﻿';

/** Builds the file and starts the download in the browser. */
export const downloadCsv = (fileName: string, rows: CsvCell[][]): void => {
  const blob = new Blob([BYTE_ORDER_MARK + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
};
