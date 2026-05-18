import type {
  Allergy,
  Appointment,
  LabOrder,
  LabOrderItem,
  MedicalCondition,
  PatientCanonicalUpdateRequest,
  PatientProfile,
  PatientReportedMedication,
  Prescription,
  PrescriptionItem,
  UserProfile,
  Vaccination,
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

export interface DoctorPatientPrescription extends Prescription {
  items: PrescriptionItem[];
}

export interface DoctorPatientLabOrder extends LabOrder {
  items: LabOrderItem[];
}

export interface DoctorPatientDetailData {
  patientProfile: UserProfile | null;
  patientExtensionProfile: PatientProfile | null;
  appointments: Appointment[];
  medicalConditions: MedicalCondition[];
  allergies: Allergy[];
  vaccinations: Vaccination[];
  prescriptions: DoctorPatientPrescription[];
  labOrders: DoctorPatientLabOrder[];
  canonicalUpdates: PatientCanonicalUpdateRequest[];
  reportedMedications: PatientReportedMedication[];
}

export function useDoctorPatientDetail(
  doctorUserId: string | null | undefined,
  patientUserId: string | null | undefined
) {
  return useQuery<DoctorPatientDetailData | null>(async () => {
    if (!doctorUserId || !patientUserId) {
      return null;
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorUserId)
      .eq('patient_id', patientUserId)
      .eq('is_deleted', false)
      .order('scheduled_at', { ascending: false });

    if (appointmentsError) {
      throw appointmentsError;
    }

    const safeAppointments = (appointments ?? []) as Appointment[];

    // Previously the hook returned null when the doctor had zero
    // non-deleted appointments with the patient, but the patient detail
    // page is also reachable from messaging / pre-visit handoffs where
    // an appointment may not exist yet. Load profile + clinical data
    // regardless; downstream consumers already handle empty arrays.

    const [
      { data: patientProfile, error: patientProfileError },
      { data: patientExtensionProfile, error: patientExtensionProfileError },
      { data: medicalConditions, error: medicalConditionsError },
      { data: allergies, error: allergiesError },
      { data: vaccinations, error: vaccinationsError },
      { data: prescriptions, error: prescriptionsError },
      { data: labOrders, error: labOrdersError },
      { data: canonicalUpdates, error: canonicalUpdatesError },
      { data: reportedMedications, error: reportedMedicationsError },
    ] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', patientUserId).maybeSingle(),
      supabase.from('patient_profiles').select('*').eq('user_id', patientUserId).maybeSingle(),
      supabase
        .from('medical_conditions')
        .select('*')
        .eq('patient_id', patientUserId)
        .eq('is_deleted', false)
        .order('diagnosed_date', { ascending: false, nullsFirst: false }),
      supabase
        .from('allergies')
        .select('*')
        .eq('patient_id', patientUserId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('vaccinations')
        .select('*')
        .eq('patient_id', patientUserId)
        .eq('is_deleted', false)
        .order('administered_date', { ascending: false, nullsFirst: false }),
      supabase
        .from('prescriptions')
        .select('*')
        .eq('doctor_id', doctorUserId)
        .eq('patient_id', patientUserId)
        .eq('is_deleted', false)
        .order('prescribed_at', { ascending: false }),
      supabase
        .from('lab_orders')
        .select('*')
        .eq('doctor_id', doctorUserId)
        .eq('patient_id', patientUserId)
        .eq('is_deleted', false)
        .order('ordered_at', { ascending: false }),
      supabase
        .from('patient_canonical_update_requests')
        .select('*')
        .eq('patient_id', patientUserId)
        .order('created_at', { ascending: false }),
      supabase
        .from('patient_reported_medications')
        .select('*')
        .eq('patient_id', patientUserId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
    ]);

    if (patientProfileError) throw patientProfileError;
    if (patientExtensionProfileError) throw patientExtensionProfileError;
    if (medicalConditionsError) throw medicalConditionsError;
    if (allergiesError) throw allergiesError;
    if (vaccinationsError) throw vaccinationsError;
    if (prescriptionsError) throw prescriptionsError;
    if (labOrdersError) throw labOrdersError;
    if (canonicalUpdatesError) throw canonicalUpdatesError;
    if (reportedMedicationsError) throw reportedMedicationsError;

    const safePrescriptions = (prescriptions ?? []) as Prescription[];
    const safeLabOrders = (labOrders ?? []) as LabOrder[];

    const prescriptionIds = safePrescriptions.map((prescription) => prescription.id);
    const labOrderIds = safeLabOrders.map((labOrder) => labOrder.id);

    const [
      { data: prescriptionItems, error: prescriptionItemsError },
      { data: labOrderItems, error: labOrderItemsError },
    ] = await Promise.all([
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
      patientProfile: (patientProfile as UserProfile | null) ?? null,
      patientExtensionProfile: (patientExtensionProfile as PatientProfile | null) ?? null,
      appointments: safeAppointments,
      medicalConditions: (medicalConditions ?? []) as MedicalCondition[],
      allergies: (allergies ?? []) as Allergy[],
      vaccinations: (vaccinations ?? []) as Vaccination[],
      prescriptions: safePrescriptions.map((prescription) => ({
        ...prescription,
        items: prescriptionItemsByPrescriptionId.get(prescription.id) ?? [],
      })),
      labOrders: safeLabOrders.map((labOrder) => ({
        ...labOrder,
        items: labOrderItemsByLabOrderId.get(labOrder.id) ?? [],
      })),
      canonicalUpdates: (canonicalUpdates ?? []) as PatientCanonicalUpdateRequest[],
      reportedMedications: (reportedMedications ?? []) as PatientReportedMedication[],
    };
  }, [doctorUserId ?? '', patientUserId ?? '']);
}
