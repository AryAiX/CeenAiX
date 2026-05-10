import i18n from 'i18next';
import { supabase } from '../lib/supabase';
import {
  hydratePrescriptionItemsWithCatalog,
  loadMedicationCatalogRowsForPrescriptionItems,
} from '../lib/medication-catalog';
import type { Prescription, PrescriptionItem } from '../types';
import { useQuery } from './use-query';

const patientFallback = () => i18n.t('shared.patient', { defaultValue: 'Patient' });

interface PatientPrescriptionProfile {
  fullName: string;
  email: string | null;
}

export interface DoctorPrescriptionRecord extends Prescription {
  patientName: string;
  patientEmail: string | null;
  items: PrescriptionItem[];
}

export function useDoctorPrescriptions(userId: string | null | undefined) {
  return useQuery<DoctorPrescriptionRecord[]>(async () => {
    if (!userId) {
      return [];
    }

    const { data: prescriptions, error: prescriptionsError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('doctor_id', userId)
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
    const patientIds = Array.from(new Set(safePrescriptions.map((prescription) => prescription.patient_id)));

    const [
      { data: prescriptionItems, error: prescriptionItemsError },
      { data: userProfiles, error: userProfilesError },
    ] = await Promise.all([
      supabase
        .from('prescription_items')
        .select('*')
        .in('prescription_id', prescriptionIds)
        .order('created_at', { ascending: true }),
      supabase.from('user_profiles').select('user_id, full_name, email').in('user_id', patientIds),
    ]);

    if (prescriptionItemsError) {
      throw prescriptionItemsError;
    }

    if (userProfilesError) {
      throw userProfilesError;
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

    const patientProfileById = new Map<string, PatientPrescriptionProfile>(
      (userProfiles ?? []).map((userProfile) => [
        userProfile.user_id,
        {
          fullName: userProfile.full_name ?? patientFallback(),
          email: userProfile.email ?? null,
        },
      ])
    );

    return safePrescriptions.map((prescription) => {
      const patientProfile = patientProfileById.get(prescription.patient_id);

      return {
        ...prescription,
        patientName: patientProfile?.fullName ?? patientFallback(),
        patientEmail: patientProfile?.email ?? null,
        items: itemsByPrescriptionId.get(prescription.id) ?? [],
      };
    });
  }, [userId]);
}
