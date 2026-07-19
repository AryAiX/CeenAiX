import type {
  Appointment,
  AppointmentPreVisitAssessment,
  AppointmentPreVisitSummary,
  ConsultationNote,
  LabOrder,
  LabOrderItem,
  Prescription,
  PrescriptionItem,
} from '../types';
import { hydrateLabOrderItemsWithCatalog, loadLabTestCatalogRowsForLabOrderItems, loadLabTestCatalogSuggestionRowsForLabOrderItems } from '../lib/lab-test-catalog';
import { hydratePrescriptionItemsWithCatalog, loadMedicationCatalogRowsForPrescriptionItems } from '../lib/medication-catalog';
import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';

export interface PatientAppointmentDoctorProfile {
  userId: string;
  fullName: string;
  specialty: string | null;
  city: string | null;
  address: string | null;
}

export interface PatientAppointmentPrescription extends Prescription {
  items: PrescriptionItem[];
}

export interface PatientAppointmentLabOrder extends LabOrder {
  items: LabOrderItem[];
}

export interface PatientAppointmentDetailData {
  appointment: Appointment;
  doctorProfile: PatientAppointmentDoctorProfile | null;
  consultationNote: ConsultationNote | null;
  preVisitAssessment: AppointmentPreVisitAssessment | null;
  preVisitSummary: AppointmentPreVisitSummary | null;
  prescriptions: PatientAppointmentPrescription[];
  labOrders: PatientAppointmentLabOrder[];
}

export function usePatientAppointmentDetail(
  patientUserId: string | null | undefined,
  appointmentId: string | null | undefined
) {
  return useQuery<PatientAppointmentDetailData | null>(async () => {
    if (!patientUserId || !appointmentId) {
      return null;
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('patient_id', patientUserId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (appointmentError) {
      throw appointmentError;
    }

    if (!appointment) {
      return null;
    }

    const safeAppointment = appointment as Appointment;

    const [
      { data: doctorUserProfile, error: doctorUserProfileError },
      { data: doctorProfile, error: doctorProfileError },
      { data: consultationNotes, error: consultationNotesError },
      { data: preVisitAssessment, error: preVisitAssessmentError },
      { data: prescriptions, error: prescriptionsError },
      { data: labOrders, error: labOrdersError },
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('user_id, full_name, city, address')
        .eq('user_id', safeAppointment.doctor_id)
        .maybeSingle(),
      supabase
        .from('doctor_profiles')
        .select('user_id, specialization')
        .eq('user_id', safeAppointment.doctor_id)
        .maybeSingle(),
      supabase
        .from('consultation_notes')
        .select('*')
        .eq('appointment_id', safeAppointment.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('appointment_pre_visit_assessments')
        .select('*')
        .eq('appointment_id', safeAppointment.id)
        .eq('patient_id', patientUserId)
        .maybeSingle(),
      supabase
        .from('prescriptions')
        .select('*')
        .eq('appointment_id', safeAppointment.id)
        .eq('patient_id', patientUserId)
        .eq('is_deleted', false)
        .order('prescribed_at', { ascending: false }),
      supabase
        .from('lab_orders')
        .select('*')
        .eq('appointment_id', safeAppointment.id)
        .eq('patient_id', patientUserId)
        .eq('is_deleted', false)
        .order('ordered_at', { ascending: false }),
    ]);

    if (doctorUserProfileError) throw doctorUserProfileError;
    if (doctorProfileError) throw doctorProfileError;
    if (consultationNotesError) throw consultationNotesError;
    if (preVisitAssessmentError) throw preVisitAssessmentError;
    if (prescriptionsError) throw prescriptionsError;
    if (labOrdersError) throw labOrdersError;

    const safePrescriptions = (prescriptions ?? []) as Prescription[];
    const safeLabOrders = (labOrders ?? []) as LabOrder[];
    const prescriptionIds = safePrescriptions.map((prescription) => prescription.id);
    const labOrderIds = safeLabOrders.map((labOrder) => labOrder.id);

    const [
      { data: preVisitSummary, error: preVisitSummaryError },
      { data: prescriptionItems, error: prescriptionItemsError },
      { data: labOrderItems, error: labOrderItemsError },
    ] = await Promise.all([
      preVisitAssessment
        ? supabase
            .from('appointment_pre_visit_summaries')
            .select('*')
            .eq('assessment_id', preVisitAssessment.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
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

    if (preVisitSummaryError) throw preVisitSummaryError;
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
      const items = prescriptionItemsByPrescriptionId.get(item.prescription_id) ?? [];
      items.push(item);
      prescriptionItemsByPrescriptionId.set(item.prescription_id, items);
    }

    const labOrderItemsByLabOrderId = new Map<string, LabOrderItem[]>();
    for (const item of hydratedLabOrderItems) {
      const items = labOrderItemsByLabOrderId.get(item.lab_order_id) ?? [];
      items.push(item);
      labOrderItemsByLabOrderId.set(item.lab_order_id, items);
    }

    return {
      appointment: safeAppointment,
      doctorProfile: doctorUserProfile
        ? {
            userId: doctorUserProfile.user_id,
            fullName: doctorUserProfile.full_name ?? 'Doctor',
            specialty: doctorProfile?.specialization ?? null,
            city: doctorUserProfile.city ?? null,
            address: doctorUserProfile.address ?? null,
          }
        : null,
      consultationNote: ((consultationNotes ?? [])[0] as ConsultationNote | undefined) ?? null,
      preVisitAssessment: (preVisitAssessment as AppointmentPreVisitAssessment | null) ?? null,
      preVisitSummary: (preVisitSummary as AppointmentPreVisitSummary | null) ?? null,
      prescriptions: safePrescriptions.map((prescription) => ({
        ...prescription,
        items: prescriptionItemsByPrescriptionId.get(prescription.id) ?? [],
      })),
      labOrders: safeLabOrders.map((labOrder) => ({
        ...labOrder,
        items: labOrderItemsByLabOrderId.get(labOrder.id) ?? [],
      })),
    };
  }, [patientUserId ?? '', appointmentId ?? '']);
}
