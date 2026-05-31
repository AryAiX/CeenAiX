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

export type PatientPharmacyWorkflowStatus =
  | 'not_sent'
  | 'new'
  | 'in_progress'
  | 'on_hold'
  | 'dispensed'
  | 'cancelled';

export interface PatientPrescriptionRecord extends Prescription {
  doctorName: string;
  doctorSpecialty: string | null;
  items: PrescriptionItem[];
  pharmacyStatus: PatientPharmacyWorkflowStatus | null;
  pharmacyName: string | null;
}

interface DispensingTaskRow {
  prescription_id: string;
  workflow_status: string;
  organization_id: string;
}

interface ActivePharmacyRow {
  id: string;
  name: string;
  city: string | null;
}

export function aggregatePharmacyWorkflowStatus(
  tasks: Pick<DispensingTaskRow, 'workflow_status'>[]
): PatientPharmacyWorkflowStatus {
  if (tasks.length === 0) {
    return 'new';
  }

  const statuses = new Set(tasks.map((task) => task.workflow_status));
  if (statuses.has('on_hold')) {
    return 'on_hold';
  }
  if (statuses.has('cancelled') && statuses.size === 1) {
    return 'cancelled';
  }
  if (statuses.has('in_progress')) {
    return 'in_progress';
  }
  if (statuses.has('new')) {
    return 'new';
  }
  if (statuses.has('dispensed')) {
    return 'dispensed';
  }

  return 'new';
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
      { data: dispensingTasks, error: dispensingTasksError },
      { data: activePharmacies, error: activePharmaciesError },
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
        .in('prescription_id', prescriptionIds),
      supabase.rpc('list_active_pharmacies'),
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

    if (dispensingTasksError) {
      throw dispensingTasksError;
    }

    if (activePharmaciesError) {
      throw activePharmaciesError;
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

    const tasksByPrescriptionId = new Map<string, DispensingTaskRow[]>();
    for (const task of (dispensingTasks ?? []) as DispensingTaskRow[]) {
      const existing = tasksByPrescriptionId.get(task.prescription_id) ?? [];
      existing.push(task);
      tasksByPrescriptionId.set(task.prescription_id, existing);
    }

    const pharmacyNameById = new Map(
      ((activePharmacies ?? []) as ActivePharmacyRow[]).map((pharmacy) => [pharmacy.id, pharmacy.name])
    );

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
      const tasks = tasksByPrescriptionId.get(prescription.id) ?? [];
      const pharmacyOrgId = prescription.pharmacy_organization_id ?? tasks[0]?.organization_id ?? null;

      return {
        ...prescription,
        doctorName: doctorProfile?.fullName ?? doctorFallback(),
        doctorSpecialty: doctorProfile?.specialty ?? null,
        items: itemsByPrescriptionId.get(prescription.id) ?? [],
        pharmacyStatus: prescription.pharmacy_organization_id
          ? aggregatePharmacyWorkflowStatus(tasks)
          : 'not_sent',
        pharmacyName: pharmacyOrgId ? (pharmacyNameById.get(pharmacyOrgId) ?? null) : null,
      };
    });
  }, [userId]);
}
