import type { ImagingStudyRecord } from '../hooks/use-imaging-studies';

/**
 * QA-149: what the doctor's Imaging worklist may show as the result of a study.
 *
 * The radiologist's findings and impression are a draft until the imaging centre releases the
 * report ('reported' and 'report_pending' are not released yet). The page used to show that draft
 * text with no label, as if it were final, and showed "Pending" as the result of a rejected study.
 */
export type ImagingReportState = 'released' | 'notReleased' | 'rejected' | 'noReport';

export function imagingReportState(status: ImagingStudyRecord['status']): ImagingReportState {
  if (status === 'released') return 'released';
  if (status === 'rejected') return 'rejected';
  if (status === 'reported' || status === 'report_pending') return 'notReleased';
  return 'noReport';
}

/** The report text to show, only once the report is released (impression first, then findings). */
export function releasedReportText(
  study: Pick<ImagingStudyRecord, 'status' | 'impression' | 'findings'>
): string | null {
  if (study.status !== 'released') return null;
  return study.impression?.trim() || study.findings?.trim() || null;
}
