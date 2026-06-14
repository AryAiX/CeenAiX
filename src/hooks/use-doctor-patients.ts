import i18n from 'i18next';
import { supabase } from '../lib/supabase';
import type { AppointmentStatus } from '../types';
import { useQuery } from './use-query';

const insuranceFallback = () =>
  i18n.t('doctor.patients.insuranceOnFile', { defaultValue: 'Insurance on file' });
const patientFallback = () => i18n.t('shared.patient', { defaultValue: 'Patient' });

const UPCOMING_STATUSES = new Set<AppointmentStatus>(['scheduled', 'confirmed', 'in_progress']);

export type DoctorPatientRisk = 'critical' | 'high' | 'medium' | 'low' | 'new';

export interface DoctorPatientSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  insuranceName: string | null;
  risk: DoctorPatientRisk;
  conditions: string[];
  allergies: string[];
  flags: string[];
  totalAppointments: number;
  upcomingAppointments: number;
  nextAppointment: string | null;
  lastAppointment: string | null;
  latestChiefComplaint: string | null;
}

interface AppointmentRow {
  id: string;
  patient_id: string;
  scheduled_at: string;
  status: AppointmentStatus;
  chief_complaint: string | null;
}

interface UserProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

interface PatientProfileRow {
  user_id: string;
  blood_type: string | null;
}

interface InsurancePlanRelation {
  name: string | null;
  provider_company: string | null;
  coverage_type: string | null;
}

interface PatientInsuranceRow {
  patient_id: string;
  is_primary: boolean | null;
  insurance_plans: InsurancePlanRelation | InsurancePlanRelation[] | null;
}

interface ConditionRow {
  patient_id: string;
  condition_name: string | null;
  status: string | null;
}

interface AllergyRow {
  patient_id: string;
  allergen: string | null;
  severity: string | null;
}

const firstRelation = <T>(relation: T | T[] | null | undefined): T | null => {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
};

const compareNullableDateAsc = (left: string | null, right: string | null) => {
  if (left && right) {
    return new Date(left).getTime() - new Date(right).getTime();
  }
  if (left) {
    return -1;
  }
  if (right) {
    return 1;
  }
  return 0;
};

const compareNullableDateDesc = (left: string | null, right: string | null) => {
  if (left && right) {
    return new Date(right).getTime() - new Date(left).getTime();
  }
  if (left) {
    return -1;
  }
  if (right) {
    return 1;
  }
  return 0;
};

export function useDoctorPatients(userId: string | null | undefined) {
  return useQuery<DoctorPatientSummary[]>(async () => {
    if (!userId) {
      return [];
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, patient_id, scheduled_at, status, chief_complaint')
      .eq('doctor_id', userId)
      .eq('is_deleted', false)
      .order('scheduled_at', { ascending: false });

    if (appointmentsError) {
      throw appointmentsError;
    }

    const safeAppointments = (appointments ?? []) as AppointmentRow[];
    const patientIds = Array.from(new Set(safeAppointments.map((appointment) => appointment.patient_id)));

    if (patientIds.length === 0) {
      return [];
    }

    const [
      { data: userProfiles, error: userProfilesError },
      { data: patientProfiles, error: patientProfilesError },
      { data: patientInsurance, error: patientInsuranceError },
      { data: medicalConditions, error: medicalConditionsError },
      { data: allergies, error: allergiesError },
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('user_id, full_name, email, phone, date_of_birth, gender')
        .in('user_id', patientIds),
      supabase.from('patient_profiles').select('user_id, blood_type').in('user_id', patientIds),
      supabase
        .from('patient_insurance')
        .select('patient_id, is_primary, insurance_plans (name, provider_company, coverage_type)')
        .in('patient_id', patientIds)
        .order('is_primary', { ascending: false }),
      supabase
        .from('medical_conditions')
        .select('patient_id, condition_name, status')
        .in('patient_id', patientIds)
        .eq('is_deleted', false)
        .in('status', ['active', 'chronic']),
      supabase
        .from('allergies')
        .select('patient_id, allergen, severity')
        .in('patient_id', patientIds)
        .eq('is_deleted', false),
    ]);

    if (userProfilesError) {
      throw userProfilesError;
    }

    if (patientProfilesError) {
      throw patientProfilesError;
    }

    if (patientInsuranceError) {
      throw patientInsuranceError;
    }

    if (medicalConditionsError) {
      throw medicalConditionsError;
    }

    if (allergiesError) {
      throw allergiesError;
    }

    const profileById = new Map(
      ((userProfiles ?? []) as UserProfileRow[]).map((profile) => [profile.user_id, profile])
    );
    const patientProfileById = new Map(
      ((patientProfiles ?? []) as PatientProfileRow[]).map((profile) => [profile.user_id, profile])
    );
    const insuranceByPatientId = new Map<string, string>();
    for (const row of (patientInsurance ?? []) as PatientInsuranceRow[]) {
      if (insuranceByPatientId.has(row.patient_id)) {
        continue;
      }

      const plan = firstRelation(row.insurance_plans);
      insuranceByPatientId.set(
        row.patient_id,
        plan?.name ?? plan?.provider_company ?? plan?.coverage_type ?? insuranceFallback()
      );
    }
    const conditionsByPatientId = new Map<string, string[]>();
    for (const condition of (medicalConditions ?? []) as ConditionRow[]) {
      if (!condition.condition_name) {
        continue;
      }

      conditionsByPatientId.set(condition.patient_id, [
        ...(conditionsByPatientId.get(condition.patient_id) ?? []),
        condition.condition_name,
      ]);
    }
    const allergiesByPatientId = new Map<string, string[]>();
    for (const allergy of (allergies ?? []) as AllergyRow[]) {
      if (!allergy.allergen) {
        continue;
      }

      const label = allergy.severity ? `${allergy.allergen} (${allergy.severity})` : allergy.allergen;
      allergiesByPatientId.set(allergy.patient_id, [...(allergiesByPatientId.get(allergy.patient_id) ?? []), label]);
    }

    const now = Date.now();

    const summaries = patientIds.map((patientId) => {
      const appointmentsForPatient = safeAppointments.filter((appointment) => appointment.patient_id === patientId);
      // scheduled_at is technically nullable in the canonical schema; coalesce
      // to an empty string so a null row can never throw out of the
      // comparator and tank the entire patients hook.
      const ascendingAppointments = [...appointmentsForPatient].sort((left, right) =>
        (left.scheduled_at ?? '').localeCompare(right.scheduled_at ?? '')
      );

      const nextAppointment =
        ascendingAppointments.find((appointment) => {
          if (!UPCOMING_STATUSES.has(appointment.status)) {
            return false;
          }
          return new Date(appointment.scheduled_at).getTime() >= now;
        }) ?? null;

      const lastAppointment =
        [...ascendingAppointments]
          .reverse()
          .find((appointment) => new Date(appointment.scheduled_at).getTime() < now) ?? null;

      const profile = profileById.get(patientId);
      const patientProfile = patientProfileById.get(patientId);
      const latestAppointment = appointmentsForPatient[0] ?? null;
      const conditions = conditionsByPatientId.get(patientId) ?? [];
      const patientAllergies = allergiesByPatientId.get(patientId) ?? [];
      const flags = [
        ...patientAllergies.map((allergy) => `Allergy: ${allergy}`),
        ...(nextAppointment?.status === 'in_progress' ? ['In session'] : []),
        ...(appointmentsForPatient.some((appointment) => appointment.status === 'no_show') ? ['Prior no-show'] : []),
        ...(appointmentsForPatient.length <= 1 ? ['New patient'] : []),
      ];
      const risk: DoctorPatientRisk =
        flags.some((flag) => /severe|critical/i.test(flag))
          ? 'critical'
          : patientAllergies.length > 0 || conditions.length >= 2
            ? 'high'
            : conditions.length === 1
              ? 'medium'
              : appointmentsForPatient.length <= 1
                ? 'new'
                : 'low';

      return {
        id: patientId,
        name: profile?.full_name?.trim() || patientFallback(),
        email: profile?.email ?? null,
        phone: profile?.phone ?? null,
        dateOfBirth: profile?.date_of_birth ?? null,
        gender: profile?.gender ?? null,
        bloodType: patientProfile?.blood_type ?? null,
        insuranceName: insuranceByPatientId.get(patientId) ?? null,
        risk,
        conditions,
        allergies: patientAllergies,
        flags,
        totalAppointments: appointmentsForPatient.length,
        upcomingAppointments: appointmentsForPatient.filter((appointment) => UPCOMING_STATUSES.has(appointment.status))
          .length,
        nextAppointment: nextAppointment?.scheduled_at ?? null,
        lastAppointment: lastAppointment?.scheduled_at ?? null,
        latestChiefComplaint: latestAppointment?.chief_complaint?.trim() || null,
      };
    });

    summaries.sort((left, right) => {
      const nextCompare = compareNullableDateAsc(left.nextAppointment, right.nextAppointment);
      if (nextCompare !== 0) {
        return nextCompare;
      }

      const lastCompare = compareNullableDateDesc(left.lastAppointment, right.lastAppointment);
      if (lastCompare !== 0) {
        return lastCompare;
      }

      return left.name.localeCompare(right.name);
    });

    return summaries;
  }, [userId]);
}
