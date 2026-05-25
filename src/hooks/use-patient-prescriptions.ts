import i18n from 'i18next';
import { supabase } from '../lib/supabase';
import {
  hydratePrescriptionItemsWithCatalog,
  loadMedicationCatalogRowsForPrescriptionItems,
} from '../lib/medication-catalog';
import type { Prescription, PrescriptionItem } from '../types';
import { useQuery } from './use-query';

const doctorFallback = () => i18n.t('shared.doctor', { defaultValue: 'Doctor' });

interface DoctorPrescriptionProfile {
  fullName: string;
  specialty: string | null;
}

export interface PatientPrescriptionRecord extends Prescription {
  doctorName: string;
  doctorSpecialty: string | null;
  items: PrescriptionItem[];
  pharmacyStatus: 'not_sent' | 'new' | 'in_progress' | 'on_hold' | 'dispensed' | 'cancelled' | null;
  pharmacyName: string | null;
}

export function usePatientPrescriptions(userId: string | null | undefined) {
  return useQuery<PatientPrescriptionRecord[]>(async () => {
    if (!userId) {
      return [];
    }

    const { data: prescriptions, error: prescriptionsError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', userId)
      .eq('is_deleted', false)
      .order('prescribed_at', { ascending: false });

    if (prescriptionsError) {
      throw prescriptionsError;
    }

    const safePrescriptions = prescriptions ?? [];

    if (safePrescriptions.length === 0) {
      return [];
    }

    const prescriptionIds = safePrescriptions.map((prescription) => prescription.id);
    const doctorIds = Array.from(new Set(safePrescriptions.map((prescription) => prescription.doctor_id)));

    const [
      { data: prescriptionItems, error: prescriptionItemsError },
      { data: userProfiles, error: userProfilesError },
      { data: doctorProfiles, error: doctorProfilesError },
      { data: dispensingTasks },
    ] = await Promise.all([
      supabase
        .from('prescription_items')
        .select('*')
        .in('prescription_id', prescriptionIds)
        .order('created_at', { ascending: true }),
      supabase.from('user_profiles').select('user_id, full_name').in('user_id', doctorIds),
      supabase.from('doctor_profiles').select('user_id, specialization').in('user_id', doctorIds),
      supabase
        .from('pharmacy_dispensing_tasks')
        .select('prescription_id, workflow_status, organization_id')
        .in('prescription_id', prescriptionIds)
        .order('received_at', { ascending: false }),
    ]);

    if (prescriptionItemsError) {
      throw prescriptionItemsError;
    }

    if (userProfilesError) {
      throw userProfilesError;
    }

    if (doctorProfilesError) {
      throw doctorProfilesError;
    }

    const hydratedPrescriptionItems = hydratePrescriptionItemsWithCatalog(
      (prescriptionItems ?? []) as PrescriptionItem[],
      await loadMedicationCatalogRowsForPrescriptionItems((prescriptionItems ?? []) as PrescriptionItem[])
    );

    const itemsByPrescriptionId = new Map<string, PrescriptionItem[]>();

    for (const item of hydratedPrescriptionItems) {
      const existingItems = itemsByPrescriptionId.get(item.prescription_id) ?? [];
      existingItems.push(item);
      itemsByPrescriptionId.set(item.prescription_id, existingItems);
    }

    const doctorSpecialtyById = new Map(
      (doctorProfiles ?? []).map((doctorProfile) => [doctorProfile.user_id, doctorProfile.specialization ?? null])
    );

    const pharmacyStatusByPrescriptionId = new Map<string, { status: string; organizationId: string }>();
    for (const task of dispensingTasks ?? []) {
      if (!pharmacyStatusByPrescriptionId.has(task.prescription_id)) {
        pharmacyStatusByPrescriptionId.set(task.prescription_id, {
          status: task.workflow_status,
          organizationId: task.organization_id,
        });
      }
    }

    const doctorProfileById = new Map<string, DoctorPrescriptionProfile>(
      (userProfiles ?? []).map((userProfile) => [
        userProfile.user_id,
        {
          fullName: userProfile.full_name ?? doctorFallback(),
          specialty: doctorSpecialtyById.get(userProfile.user_id) ?? null,
        },
      ])
    );

    return safePrescriptions.map((prescription) => {
      const doctorProfile = doctorProfileById.get(prescription.doctor_id);
      const pharmacyTask = pharmacyStatusByPrescriptionId.get(prescription.id);

      return {
        ...prescription,
        doctorName: doctorProfile?.fullName ?? doctorFallback(),
        doctorSpecialty: doctorProfile?.specialty ?? null,
        items: itemsByPrescriptionId.get(prescription.id) ?? [],
        pharmacyStatus: prescription.pharmacy_organization_id
          ? ((pharmacyTask?.status ?? 'new') as PatientPrescriptionRecord['pharmacyStatus'])
          : 'not_sent',
        pharmacyName: null,
      };
    });
  }, [userId]);
}
