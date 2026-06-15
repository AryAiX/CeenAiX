import type {
  Appointment,
  AppointmentPreVisitAnswer,
  AppointmentPreVisitAssessment,
  AppointmentPreVisitSummary,
  ConsultationNote,
  LabOrder,
  LabOrderItem,
  PatientCanonicalUpdateRequest,
  PatientProfile,
  PatientReportedMedication,
  Prescription,
  PrescriptionItem,
  UserProfile,
} from '../types';
import { useQuery } from './use-query';
import { supabase } from '../lib/supabase';
import {
  hydratePrescriptionItemsWithCatalog,
  loadMedicationCatalogRowsForPrescriptionItems,
} from '../lib/medication-catalog';
import {
  hydrateLabOrderItemsWithCatalog,
  loadLabTestCatalogRowsForLabOrderItems,
  loadLabTestCatalogSuggestionRowsForLabOrderItems,
} from '../lib/lab-test-catalog';

export interface DoctorAppointmentPrescription extends Prescription {
  items: PrescriptionItem[];
}

export interface DoctorAppointmentLabOrder extends LabOrder {
  items: LabOrderItem[];
}

export interface DoctorAppointmentDetailData {
  appointment: Appointment;
  patientProfile: UserProfile | null;
  patientExtensionProfile: PatientProfile | null;
  consultationNote: ConsultationNote | null;
  preVisitAssessment: AppointmentPreVisitAssessment | null;
  preVisitAnswers: AppointmentPreVisitAnswer[];
  preVisitSummary: AppointmentPreVisitSummary | null;
  preVisitCanonicalUpdates: PatientCanonicalUpdateRequest[];
  reportedMedications: PatientReportedMedication[];
  prescriptions: DoctorAppointmentPrescription[];
  labOrders: DoctorAppointmentLabOrder[];
}

const isUserProfilesRecursionError = (error: { code?: string; message?: string } | null) =>
  error?.code === '42P17' &&
  (error.message?.toLowerCase().includes('infinite recursion') ?? false);

export function useDoctorAppointmentDetail(
  doctorUserId: string | null | undefined,
  appointmentId: string | null | undefined
) {
  return useQuery<DoctorAppointmentDetailData | null>(async () => {
    if (!doctorUserId || !appointmentId) {
      return null;
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('doctor_id', doctorUserId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (appointmentError) {
      throw appointmentError;
    }

    if (!appointment) {
      return null;
    }

    const [
      { data: patientProfile, error: patientProfileError },
      { data: patientExtensionProfile, error: patientExtensionProfileError },
      { data: consultationNotes, error: consultationNotesError },
      { data: preVisitAssessment, error: preVisitAssessmentError },
      { data: prescriptions, error: prescriptionsError },
      { data: labOrders, error: labOrdersError },
      { data: reportedMedications, error: reportedMedicationsError },
    ] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', appointment.patient_id).maybeSingle(),
      supabase.from('patient_profiles').select('*').eq('user_id', appointment.patient_id).maybeSingle(),
      supabase
        .from('consultation_notes')
        .select('*')
        .eq('appointment_id', appointment.id)
        .eq('doctor_id', doctorUserId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('appointment_pre_visit_assessments')
        .select('*')
        .eq('appointment_id', appointment.id)
        .maybeSingle(),
      supabase
        .from('prescriptions')
        .select('*')
        .eq('appointment_id', appointment.id)
        .eq('doctor_id', doctorUserId)
        .eq('is_deleted', false)
        .order('prescribed_at', { ascending: false }),
      supabase
        .from('lab_orders')
        .select('*')
        .eq('appointment_id', appointment.id)
        .eq('doctor_id', doctorUserId)
        .eq('is_deleted', false)
        .order('ordered_at', { ascending: false }),
      supabase
        .from('patient_reported_medications')
        .select('*')
        .eq('patient_id', appointment.patient_id)
        .eq('is_deleted', false)
        .eq('is_current', true)
        .order('created_at', { ascending: false }),
    ]);

    if (patientProfileError && !isUserProfilesRecursionError(patientProfileError)) throw patientProfileError;
    if (patientExtensionProfileError) throw patientExtensionProfileError;
    if (consultationNotesError) throw consultationNotesError;
    if (preVisitAssessmentError) throw preVisitAssessmentError;
    if (prescriptionsError) throw prescriptionsError;
    if (labOrdersError) throw labOrdersError;
    if (reportedMedicationsError) throw reportedMedicationsError;

    const safePrescriptions = (prescriptions ?? []) as Prescription[];
    const safeLabOrders = (labOrders ?? []) as LabOrder[];
    const prescriptionIds = safePrescriptions.map((prescription) => prescription.id);
    const labOrderIds = safeLabOrders.map((labOrder) => labOrder.id);

    const [
      { data: preVisitAnswers, error: preVisitAnswersError },
      { data: preVisitSummary, error: preVisitSummaryError },
      { data: preVisitCanonicalUpdates, error: preVisitCanonicalUpdatesError },
      { data: prescriptionItems, error: prescriptionItemsError },
      { data: labOrderItems, error: labOrderItemsError },
    ] = await Promise.all([
      preVisitAssessment
        ? supabase
            .from('appointment_pre_visit_answers')
            .select('*')
            .eq('assessment_id', preVisitAssessment.id)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      preVisitAssessment
        ? supabase
            .from('appointment_pre_visit_summaries')
            .select('*')
            .eq('assessment_id', preVisitAssessment.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      preVisitAssessment
        ? supabase
            .from('patient_canonical_update_requests')
            .select('*')
            .eq('patient_id', appointment.patient_id)
            .eq('source_kind', 'pre_visit_assessment')
            .eq('source_record_id', preVisitAssessment.id)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      prescriptionIds.length > 0
        ? supabase
            .from('prescription_items')
            .select('*')
            .in('prescription_id', prescriptionIds)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      labOrderIds.length > 0
        ? supabase
            .from('lab_order_items')
            .select('*')
            .in('lab_order_id', labOrderIds)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (preVisitAnswersError) throw preVisitAnswersError;
    if (preVisitSummaryError) throw preVisitSummaryError;
    if (preVisitCanonicalUpdatesError) throw preVisitCanonicalUpdatesError;
    if (prescriptionItemsError) throw prescriptionItemsError;
    if (labOrderItemsError) throw labOrderItemsError;

    const hydratedPrescriptionItems = hydratePrescriptionItemsWithCatalog(
      (prescriptionItems ?? []) as PrescriptionItem[],
      await loadMedicationCatalogRowsForPrescriptionItems((prescriptionItems ?? []) as PrescriptionItem[])
    );
    const hydratedLabOrderItems = hydrateLabOrderItemsWithCatalog(
      (labOrderItems ?? []) as LabOrderItem[],
      await loadLabTestCatalogRowsForLabOrderItems((labOrderItems ?? []) as LabOrderItem[]),
      await loadLabTestCatalogSuggestionRowsForLabOrderItems((labOrderItems ?? []) as LabOrderItem[])
    );

    const prescriptionItemsByPrescriptionId = new Map<string, PrescriptionItem[]>();
    for (const item of hydratedPrescriptionItems) {
      const existingItems = prescriptionItemsByPrescriptionId.get(item.prescription_id) ?? [];
      existingItems.push(item);
      prescriptionItemsByPrescriptionId.set(item.prescription_id, existingItems);
    }

    const labOrderItemsByLabOrderId = new Map<string, LabOrderItem[]>();
    for (const item of hydratedLabOrderItems) {
      const existingItems = labOrderItemsByLabOrderId.get(item.lab_order_id) ?? [];
      existingItems.push(item);
      labOrderItemsByLabOrderId.set(item.lab_order_id, existingItems);
    }

    return {
      appointment: appointment as Appointment,
      patientProfile: (patientProfile as UserProfile | null) ?? null,
      patientExtensionProfile: (patientExtensionProfile as PatientProfile | null) ?? null,
      consultationNote: ((consultationNotes ?? [])[0] as ConsultationNote | undefined) ?? null,
      preVisitAssessment: (preVisitAssessment as AppointmentPreVisitAssessment | null) ?? null,
      preVisitAnswers: (preVisitAnswers ?? []) as AppointmentPreVisitAnswer[],
      preVisitSummary: (preVisitSummary as AppointmentPreVisitSummary | null) ?? null,
      preVisitCanonicalUpdates: (preVisitCanonicalUpdates ?? []) as PatientCanonicalUpdateRequest[],
      reportedMedications: (reportedMedications ?? []) as PatientReportedMedication[],
      prescriptions: safePrescriptions.map((prescription) => ({
        ...prescription,
        items: prescriptionItemsByPrescriptionId.get(prescription.id) ?? [],
      })),
      labOrders: safeLabOrders.map((labOrder) => ({
        ...labOrder,
        items: labOrderItemsByLabOrderId.get(labOrder.id) ?? [],
      })),
    };
  }, [doctorUserId ?? '', appointmentId ?? '']);
}
