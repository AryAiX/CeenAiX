import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';

export type ImagingStudyStatus =
  | 'ordered'
  | 'scheduled'
  | 'scanning'
  | 'report_pending'
  | 'reported'
  | 'released'
  | 'rejected';

export interface ImagingStudyRecord {
  id: string;
  accession: string;
  patientId: string | null;
  doctorId: string | null;
  patientName: string;
  doctorName: string;
  clinicName: string;
  modality: string;
  studyName: string;
  priority: string;
  status: ImagingStudyStatus;
  room: string | null;
  scheduledAt: string | null;
  releasedAt: string | null;
  reviewedAt: string | null;
  findings: string | null;
  impression: string | null;
  recommendations: string | null;
  reportStatus: string | null;
  alerts: string[];
  isDeleted: boolean;
}

interface ImagingStudyRow {
  id: string;
  accession: string;
  patient_id: string | null;
  doctor_id: string | null;
  patient_name: string;
  doctor_name: string;
  clinic_name: string;
  modality: string;
  study_name: string;
  priority: string;
  status: ImagingStudyStatus;
  room: string | null;
  scheduled_at: string | null;
  released_at: string | null;
  reviewed_at: string | null;
  findings: string | null;
  impression: string | null;
  recommendations: string | null;
  report_status: string | null;
  alerts: string[] | null;
  is_deleted: boolean | null;
}

const mapStudy = (row: ImagingStudyRow): ImagingStudyRecord => ({
  id: row.id,
  accession: row.accession,
  patientId: row.patient_id,
  doctorId: row.doctor_id,
  patientName: row.patient_name,
  doctorName: row.doctor_name,
  clinicName: row.clinic_name,
  modality: row.modality,
  studyName: row.study_name,
  priority: row.priority,
  status: row.status,
  room: row.room,
  scheduledAt: row.scheduled_at,
  releasedAt: row.released_at,
  reviewedAt: row.reviewed_at,
  findings: row.findings,
  impression: row.impression,
  recommendations: row.recommendations,
  reportStatus: row.report_status,
  alerts: row.alerts ?? [],
  isDeleted: row.is_deleted ?? false,
});

export function useImagingStudies(
  userId: string | null | undefined,
  role: 'doctor' | 'patient'
) {
  return useQuery<ImagingStudyRecord[]>(async () => {
    if (!userId) {
      return [];
    }

    let query = supabase
      .from('lab_portal_imaging_studies')
      .select(
        'id, accession, patient_id, doctor_id, patient_name, doctor_name, clinic_name, modality, study_name, priority, status, room, scheduled_at, released_at, reviewed_at, findings, impression, recommendations, report_status, alerts, is_deleted'
      )
      .eq('is_deleted', false);

    query = role === 'doctor'
      ? query.eq('doctor_id', userId)
      : query.eq('patient_id', userId);

    const { data, error } = await query
      .order('scheduled_at', { ascending: false })
      .order('released_at', { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as ImagingStudyRow[]).map(mapStudy);
  }, [userId ?? '', role]);
}

export async function markDoctorImagingStudyReviewed(studyId: string): Promise<void> {
  const { error } = await supabase.rpc('doctor_review_imaging_study', {
    p_study_id: studyId,
  });
  if (error) {
    throw error;
  }
}
