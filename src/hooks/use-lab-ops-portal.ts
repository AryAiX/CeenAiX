import { useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';
import type { LabOrderStatus, LabOrderUrgency } from '../types';

export type LabPriority = 'STAT' | 'Urgent' | 'Routine';
export type LabDepartment = 'laboratory' | 'radiology';
export type ImagingStatus = 'ordered' | 'scheduled' | 'scanning' | 'report_pending' | 'reported' | 'released';
export type EquipmentStatus = 'online' | 'maintenance' | 'warning' | 'offline';
export type NabidhStatus = 'pending' | 'submitted' | 'failed';

export interface LabFacilityProfile {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export interface LabFacilityMeta {
  shortCode: string;
  arabicName: string | null;
  facilityType: string | null;
  operatingHours: string | null;
  website: string | null;
  ceenaixIntegration: string | null;
  dhaLabLicense: string | null;
  dhaLabExpiry: string | null;
  dhaLabAccreditations: string | null;
  dhaRadiologyLicense: string | null;
  dhaRadiologyExpiry: string | null;
  dhaRadiologyAccreditations: string | null;
  nabidhVendorId: string | null;
  radiologistName: string | null;
  radiologistCredentials: string | null;
  technicianName: string | null;
  technicianCredentials: string | null;
}

export interface LabPortalSampleTest {
  testName: string;
  loincCode: string | null;
  specimen: string | null;
  targetTat: string | null;
  referenceText: string | null;
  referenceMin: string | null;
  referenceMax: string | null;
  resultValue: string | null;
  resultUnit: string | null;
  flag: string | null;
  isAbnormal: boolean | null;
  status: LabOrderStatus;
  statusCategory: string | null;
}

export interface LabPortalSample {
  id: string;
  orderCode: string;
  patientId: string;
  patientName: string;
  patientAge: number | null;
  patientGender: string | null;
  bloodType: string | null;
  insurancePlan: string | null;
  doctorName: string;
  doctorSpecialty: string | null;
  doctorDhaLicense: string | null;
  clinicName: string;
  firstTestName: string;
  tests: LabPortalSampleTest[];
  testNames: string[];
  priority: LabPriority;
  status: LabOrderStatus;
  orderedAt: string;
  collectedAt: string | null;
  receivedAt: string | null;
  dueBy: string | null;
  releasedAt: string | null;
  tatMinutes: number | null;
  criticalValue: string | null;
  pendingTestCount: number;
  resultedTestCount: number;
  totalTestCount: number;
  nabidhReference: string | null;
  totalCostAed: number | null;
  clinicalNotes: string | null;
  specimenSummary: string | null;
  fastingInstructions: string | null;
  preauthStatus: string | null;
  technicianName: string | null;
  technicianInitials: string | null;
  sourceLabel: string | null;
}

export interface LabPortalImagingStudy {
  id: string;
  labId: string;
  accession: string;
  patientName: string;
  patientAge: number | null;
  patientGender: string | null;
  doctorName: string;
  clinicName: string;
  modality: string;
  studyName: string;
  priority: LabPriority;
  status: ImagingStatus;
  room: string | null;
  scheduledAt: string | null;
  progressPercent: number;
  tatMinutes: number | null;
  reportStatus: string | null;
  nabidhStatus: NabidhStatus;
  alerts: string[];
  icd10Code: string | null;
  icd10Description: string | null;
  cptCode: string | null;
  clinicalIndication: string | null;
  contrast: string | null;
  prepInstructions: string | null;
  roomsAvailableSummary: string | null;
  suggestedSlot: string | null;
  preauthStatus: string | null;
  preauthCoverage: string | null;
  insurancePlan: string | null;
  doctorDhaLicense: string | null;
  doctorSpecialty: string | null;
  sourceLabel: string | null;
}

export interface LabPortalReagent {
  name: string;
  percent: number;
}

export interface LabPortalEquipment {
  id: string;
  labId: string;
  department: LabDepartment;
  name: string;
  equipmentType: string;
  room: string | null;
  status: EquipmentStatus;
  metricLabel: string | null;
  metricValue: string | null;
  qcStatus: string | null;
  reagentLevelPercent: number | null;
  alert: string | null;
  maintenanceDueAt: string | null;
  subtitle: string | null;
  todayCount: number | null;
  uptimePercent: number | null;
  qcLotNumber: string | null;
  qcPassedAtLabel: string | null;
  reagents: LabPortalReagent[];
  activeUserLabel: string | null;
  activeRemainingLabel: string | null;
}

export interface LabPortalQcRun {
  id: string;
  labId: string;
  department: LabDepartment;
  instrumentName: string;
  lotNumber: string;
  levelLabel: string;
  resultLabel: string;
  status: 'passed' | 'warning' | 'failed';
  runAt: string;
}

export interface LabPortalNabidhEvent {
  id: string;
  labId: string;
  resourceType: string;
  referenceCode: string;
  patientName: string;
  status: NabidhStatus;
  reason: string | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface LabPortalSettingOption {
  id: string;
  label: string;
  isSelected: boolean;
}

export interface LabPortalSetting {
  id: string;
  labId: string;
  section: string;
  label: string;
  value: string;
  enabled: boolean;
  options: LabPortalSettingOption[];
}

export interface LabPortalCriticalValue {
  id: string;
  patientName: string;
  testName: string;
  valueLabel: string;
  notifiedInMinutes: number | null;
  status: 'pending' | 'notified';
  observedAt: string;
}

export interface LabPortalTopMetric {
  id: string;
  category: 'lab_test' | 'imaging_study';
  label: string;
  value: number;
  sortOrder: number;
}

export interface LabPortalVolumeTrend {
  id: string;
  dayLabel: string;
  labVolume: number;
  radiologyVolume: number;
  sortOrder: number;
}

export interface LabPortalData {
  facility: LabFacilityProfile | null;
  facilityMeta: LabFacilityMeta | null;
  samples: LabPortalSample[];
  imagingStudies: LabPortalImagingStudy[];
  equipment: LabPortalEquipment[];
  qcRuns: LabPortalQcRun[];
  nabidhEvents: LabPortalNabidhEvent[];
  settings: LabPortalSetting[];
  criticalValues: LabPortalCriticalValue[];
  topLabTests: LabPortalTopMetric[];
  topImagingStudies: LabPortalTopMetric[];
  volumeTrends: LabPortalVolumeTrend[];
  metrics: {
    labQueue: number;
    labOrders: number;
    labResults: number;
    qualityWarnings: number;
    imagingQueue: number;
    imagingOrders: number;
    radiologyReports: number;
    imagingEquipmentWarnings: number;
    labEquipmentWarnings: number;
    nabidhPending: number;
    nabidhSubmitted: number;
    nabidhFailed: number;
    criticalUnnotified: number;
    completedToday: number;
    sampleCountToday: number;
    studyCountToday: number;
  };
}

interface LabStaffRow {
  lab_id: string;
}

interface LabProfileRow {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface FacilityMetaRow {
  short_code: string;
  arabic_name: string | null;
  facility_type: string | null;
  operating_hours: string | null;
  website: string | null;
  ceenaix_integration: string | null;
  dha_lab_license: string | null;
  dha_lab_expiry: string | null;
  dha_lab_accreditations: string | null;
  dha_radiology_license: string | null;
  dha_radiology_expiry: string | null;
  dha_radiology_accreditations: string | null;
  nabidh_vendor_id: string | null;
  radiologist_name: string | null;
  radiologist_credentials: string | null;
  technician_name: string | null;
  technician_credentials: string | null;
}

interface LabOrderRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: LabOrderStatus;
  ordered_at: string;
  assigned_lab_id: string | null;
  lab_order_code: string | null;
  nabidh_reference: string | null;
  sample_collection_at: string | null;
  results_released_at: string | null;
  due_by: string | null;
  urgency: LabOrderUrgency | null;
  total_cost_aed: number | null;
  insurance_plan: string | null;
  blood_type: string | null;
  doctor_dha_license: string | null;
  doctor_specialty: string | null;
  clinic_name: string | null;
  clinical_notes: string | null;
  specimen_summary: string | null;
  fasting_instructions: string | null;
  preauth_status: string | null;
  technician_name: string | null;
  technician_initials: string | null;
  source_label: string | null;
  patient_display_name: string | null;
  patient_age: number | null;
  patient_gender: string | null;
}

interface LabItemRow {
  lab_order_id: string;
  test_name: string;
  status: LabOrderStatus;
  status_category: string | null;
  result_value: string | null;
  result_unit: string | null;
  flag: string | null;
  resulted_at: string | null;
  loinc_code: string | null;
  specimen_type: string | null;
  target_tat: string | null;
  reference_text: string | null;
  reference_min_value: string | null;
  reference_max_value: string | null;
  is_abnormal: boolean | null;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  city: string | null;
}

interface ImagingStudyRow {
  id: string;
  lab_id: string;
  accession: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  doctor_name: string;
  clinic_name: string;
  modality: string;
  study_name: string;
  priority: LabPriority;
  status: ImagingStatus;
  room: string | null;
  scheduled_at: string | null;
  progress_percent: number | null;
  tat_minutes: number | null;
  report_status: string | null;
  nabidh_status: NabidhStatus;
  alerts: string[] | null;
  icd10_code: string | null;
  icd10_description: string | null;
  cpt_code: string | null;
  clinical_indication: string | null;
  contrast: string | null;
  prep_instructions: string | null;
  rooms_available_summary: string | null;
  suggested_slot: string | null;
  preauth_status: string | null;
  preauth_coverage: string | null;
  insurance_plan: string | null;
  doctor_dha_license: string | null;
  doctor_specialty: string | null;
  source_label: string | null;
}

interface EquipmentRow {
  id: string;
  lab_id: string;
  department: LabDepartment;
  name: string;
  equipment_type: string;
  room: string | null;
  status: EquipmentStatus;
  metric_label: string | null;
  metric_value: string | null;
  qc_status: string | null;
  reagent_level_percent: number | null;
  alert: string | null;
  maintenance_due_at: string | null;
  subtitle: string | null;
  today_count: number | null;
  uptime_percent: number | null;
  qc_lot_number: string | null;
  qc_passed_at_label: string | null;
  reagents: unknown;
  active_user_label: string | null;
  active_remaining_label: string | null;
}

interface QcRunRow {
  id: string;
  lab_id: string;
  department: LabDepartment;
  instrument_name: string;
  lot_number: string;
  level_label: string;
  result_label: string;
  status: 'passed' | 'warning' | 'failed';
  run_at: string;
}

interface NabidhEventRow {
  id: string;
  lab_id: string;
  resource_type: string;
  reference_code: string;
  patient_name: string;
  status: NabidhStatus;
  reason: string | null;
  submitted_at: string | null;
  created_at: string;
}

interface SettingRow {
  id: string;
  lab_id: string;
  section: string;
  label: string;
  value: string;
  enabled: boolean;
}

interface SettingOptionRow {
  id: string;
  setting_id: string;
  label: string;
  is_selected: boolean;
  sort_order: number;
}

interface CriticalValueRow {
  id: string;
  lab_id: string;
  patient_name: string;
  test_name: string;
  value_label: string;
  notified_in_minutes: number | null;
  status: 'pending' | 'notified';
  observed_at: string;
}

interface TopMetricRow {
  id: string;
  lab_id: string;
  category: 'lab_test' | 'imaging_study';
  label: string;
  value: number;
  sort_order: number;
}

interface VolumeTrendRow {
  id: string;
  lab_id: string;
  day_label: string;
  lab_volume: number;
  radiology_volume: number;
  sort_order: number;
}

const todayStartIso = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
};

const minutesBetween = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
};

const normalizePriority = (urgency: LabOrderUrgency | null | undefined): LabPriority => {
  if (urgency === 'stat') return 'STAT';
  if (urgency === 'urgent') return 'Urgent';
  return 'Routine';
};

const calculateAge = (dateOfBirth: string | null) => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
};

const parseReagents = (raw: unknown): LabPortalReagent[] => {
  if (!Array.isArray(raw)) return [];
  return (raw as Array<{ name?: string; percent?: number }>)
    .filter((entry) => entry && typeof entry.name === 'string' && typeof entry.percent === 'number')
    .map((entry) => ({ name: String(entry.name), percent: Number(entry.percent) }));
};

export function useLabOpsPortal(userId: string | null | undefined) {
  const memoizedUserId = userId ?? null;

  return useQuery<LabPortalData | null>(async () => {
    if (!memoizedUserId) {
      return null;
    }

    const { data: staffRows, error: staffError } = await supabase
      .from('lab_staff')
      .select('lab_id')
      .eq('user_id', memoizedUserId)
      .eq('is_active', true);
    if (staffError) throw staffError;

    const staffLabIds = Array.from(new Set(((staffRows ?? []) as LabStaffRow[]).map((row) => row.lab_id)));

    const profileResponse = staffLabIds.length > 0
      ? await supabase
          .from('lab_profiles')
          .select('id, slug, name, city, address, phone, email')
          .in('id', staffLabIds)
      : await supabase
          .from('lab_profiles')
          .select('id, slug, name, city, address, phone, email')
          .eq('slug', 'dubai-medical-imaging-centre');
    if (profileResponse.error) throw profileResponse.error;

    const profileRows = (profileResponse.data ?? []) as LabProfileRow[];
    const profileRow =
      profileRows.find((row) => row.slug === 'dubai-medical-imaging-centre') ??
      profileRows[0] ??
      null;
    const labId = profileRow?.id ?? null;

    let facility: LabFacilityProfile | null = null;
    if (profileRow) {
      facility = {
        id: profileRow.id,
        slug: profileRow.slug,
        name: profileRow.name,
        city: profileRow.city,
        address: profileRow.address,
        phone: profileRow.phone,
        email: profileRow.email,
      };
    }

    let facilityMeta: LabFacilityMeta | null = null;
    if (labId) {
      const { data: metaData } = await supabase
        .from('lab_portal_facility_meta')
        .select('*')
        .eq('lab_id', labId)
        .maybeSingle();
      if (metaData) {
        const m = metaData as FacilityMetaRow;
        facilityMeta = {
          shortCode: m.short_code,
          arabicName: m.arabic_name,
          facilityType: m.facility_type,
          operatingHours: m.operating_hours,
          website: m.website,
          ceenaixIntegration: m.ceenaix_integration,
          dhaLabLicense: m.dha_lab_license,
          dhaLabExpiry: m.dha_lab_expiry,
          dhaLabAccreditations: m.dha_lab_accreditations,
          dhaRadiologyLicense: m.dha_radiology_license,
          dhaRadiologyExpiry: m.dha_radiology_expiry,
          dhaRadiologyAccreditations: m.dha_radiology_accreditations,
          nabidhVendorId: m.nabidh_vendor_id,
          radiologistName: m.radiologist_name,
          radiologistCredentials: m.radiologist_credentials,
          technicianName: m.technician_name,
          technicianCredentials: m.technician_credentials,
        };
      }
    }

    let ordersQuery = supabase
      .from('lab_orders')
      .select('id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, nabidh_reference, sample_collection_at, results_released_at, due_by, urgency, total_cost_aed, insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name, clinical_notes, specimen_summary, fasting_instructions, preauth_status, technician_name, technician_initials, source_label, patient_display_name, patient_age, patient_gender')
      .eq('is_deleted', false)
      .order('ordered_at', { ascending: false })
      .limit(150);

    if (staffLabIds.length > 0) {
      ordersQuery = ordersQuery.or(`assigned_lab_id.in.(${staffLabIds.join(',')}),assigned_lab_id.is.null`);
    } else if (labId) {
      ordersQuery = ordersQuery.or(`assigned_lab_id.eq.${labId},assigned_lab_id.is.null`);
    }

    const [
      { data: orderData, error: ordersError },
      { data: imagingData, error: imagingError },
      { data: equipmentData, error: equipmentError },
      { data: qcData, error: qcError },
      { data: nabidhData, error: nabidhError },
      { data: settingsData, error: settingsError },
      { data: criticalData, error: criticalError },
      { data: topMetricsData, error: topMetricsError },
      { data: volumeData, error: volumeError },
    ] = await Promise.all([
      ordersQuery,
      labId
        ? supabase.from('lab_portal_imaging_studies').select('*').eq('lab_id', labId).order('scheduled_at', { ascending: true })
        : supabase.from('lab_portal_imaging_studies').select('*').limit(0),
      labId
        ? supabase.from('lab_portal_equipment').select('*').eq('lab_id', labId).order('department', { ascending: true })
        : supabase.from('lab_portal_equipment').select('*').limit(0),
      labId
        ? supabase.from('lab_portal_qc_runs').select('*').eq('lab_id', labId).order('run_at', { ascending: false }).limit(24)
        : supabase.from('lab_portal_qc_runs').select('*').limit(0),
      labId
        ? supabase.from('lab_portal_nabidh_events').select('*').eq('lab_id', labId).order('created_at', { ascending: false }).limit(50)
        : supabase.from('lab_portal_nabidh_events').select('*').limit(0),
      labId
        ? supabase.from('lab_portal_settings').select('*').eq('lab_id', labId).order('section', { ascending: true })
        : supabase.from('lab_portal_settings').select('*').limit(0),
      labId
        ? supabase.from('lab_portal_critical_values').select('*').eq('lab_id', labId).order('observed_at', { ascending: false })
        : supabase.from('lab_portal_critical_values').select('*').limit(0),
      labId
        ? supabase.from('lab_portal_top_metrics').select('*').eq('lab_id', labId).order('sort_order', { ascending: true })
        : supabase.from('lab_portal_top_metrics').select('*').limit(0),
      labId
        ? supabase.from('lab_portal_volume_trends').select('*').eq('lab_id', labId).order('sort_order', { ascending: true })
        : supabase.from('lab_portal_volume_trends').select('*').limit(0),
    ]);

    if (ordersError) throw ordersError;
    if (imagingError) throw imagingError;
    if (equipmentError) throw equipmentError;
    if (qcError) throw qcError;
    if (nabidhError) throw nabidhError;
    if (settingsError) throw settingsError;
    if (criticalError) throw criticalError;
    if (topMetricsError) throw topMetricsError;
    if (volumeError) throw volumeError;

    const orders = (orderData ?? []) as LabOrderRow[];
    const orderIds = orders.map((order) => order.id);

    let itemRows: LabItemRow[] = [];
    if (orderIds.length > 0) {
      const { data, error } = await supabase
        .from('lab_order_items')
        .select('lab_order_id, test_name, status, status_category, result_value, result_unit, flag, resulted_at, loinc_code, specimen_type, target_tat, reference_text, reference_min_value, reference_max_value, is_abnormal')
        .in('lab_order_id', orderIds)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      itemRows = (data ?? []) as LabItemRow[];
    }

    const participantIds = Array.from(new Set(orders.flatMap((order) => [order.patient_id, order.doctor_id])));
    const profilesById = new Map<string, ProfileRow>();
    if (participantIds.length > 0) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, date_of_birth, gender, city')
        .in('user_id', participantIds);
      if (error) throw error;
      ((data ?? []) as ProfileRow[]).forEach((profile) => profilesById.set(profile.user_id, profile));
    }

    const itemsByOrder = new Map<string, LabItemRow[]>();
    itemRows.forEach((item) => {
      const existing = itemsByOrder.get(item.lab_order_id) ?? [];
      existing.push(item);
      itemsByOrder.set(item.lab_order_id, existing);
    });

    const samples: LabPortalSample[] = orders.map((order) => {
      const items = itemsByOrder.get(order.id) ?? [];
      const patient = profilesById.get(order.patient_id);
      const doctor = profilesById.get(order.doctor_id);
      const criticalItem = items.find((item) => item.status_category === 'critical' || item.flag === 'HH' || item.flag === 'LL');
      const resulted = items.filter((item) => item.status === 'resulted' || item.status === 'reviewed').length;
      const pending = Math.max(0, items.length - resulted);

      return {
        id: order.id,
        orderCode: order.lab_order_code ?? `LAB-${order.id.slice(0, 8).toUpperCase()}`,
        patientId: order.patient_id,
        patientName: order.patient_display_name ?? patient?.full_name ?? 'Unassigned patient',
        patientAge: order.patient_age ?? calculateAge(patient?.date_of_birth ?? null),
        patientGender: order.patient_gender ?? patient?.gender ?? null,
        bloodType: order.blood_type,
        insurancePlan: order.insurance_plan,
        doctorName: doctor?.full_name ?? 'Ordering clinician',
        doctorSpecialty: order.doctor_specialty,
        doctorDhaLicense: order.doctor_dha_license,
        clinicName: order.clinic_name ?? (doctor?.city ? `${doctor.city} Clinic` : 'Dubai Care Clinic'),
        firstTestName: items[0]?.test_name ?? 'Diagnostic panel',
        tests: items.map((item) => ({
          testName: item.test_name,
          loincCode: item.loinc_code,
          specimen: item.specimen_type,
          targetTat: item.target_tat,
          referenceText: item.reference_text,
          referenceMin: item.reference_min_value,
          referenceMax: item.reference_max_value,
          resultValue: item.result_value,
          resultUnit: item.result_unit,
          flag: item.flag,
          isAbnormal: item.is_abnormal,
          status: item.status,
          statusCategory: item.status_category,
        })),
        testNames: items.map((item) => item.test_name),
        priority: normalizePriority(order.urgency),
        status: order.status,
        orderedAt: order.ordered_at,
        collectedAt: order.sample_collection_at,
        receivedAt: order.sample_collection_at ?? order.ordered_at,
        dueBy: order.due_by,
        releasedAt: order.results_released_at,
        tatMinutes: minutesBetween(order.sample_collection_at ?? order.ordered_at, order.results_released_at ?? new Date().toISOString()),
        criticalValue: criticalItem
          ? `${criticalItem.test_name}: ${[criticalItem.result_value, criticalItem.result_unit].filter(Boolean).join(' ')}`
          : null,
        pendingTestCount: pending,
        resultedTestCount: resulted,
        totalTestCount: items.length,
        nabidhReference: order.nabidh_reference,
        totalCostAed: order.total_cost_aed,
        clinicalNotes: order.clinical_notes,
        specimenSummary: order.specimen_summary,
        fastingInstructions: order.fasting_instructions,
        preauthStatus: order.preauth_status,
        technicianName: order.technician_name,
        technicianInitials: order.technician_initials,
        sourceLabel: order.source_label,
      };
    });

    const imagingStudies: LabPortalImagingStudy[] = ((imagingData ?? []) as ImagingStudyRow[]).map((study) => ({
      id: study.id,
      labId: study.lab_id,
      accession: study.accession,
      patientName: study.patient_name,
      patientAge: study.patient_age,
      patientGender: study.patient_gender,
      doctorName: study.doctor_name,
      clinicName: study.clinic_name,
      modality: study.modality,
      studyName: study.study_name,
      priority: study.priority,
      status: study.status,
      room: study.room,
      scheduledAt: study.scheduled_at,
      progressPercent: study.progress_percent ?? 0,
      tatMinutes: study.tat_minutes,
      reportStatus: study.report_status,
      nabidhStatus: study.nabidh_status,
      alerts: study.alerts ?? [],
      icd10Code: study.icd10_code,
      icd10Description: study.icd10_description,
      cptCode: study.cpt_code,
      clinicalIndication: study.clinical_indication,
      contrast: study.contrast,
      prepInstructions: study.prep_instructions,
      roomsAvailableSummary: study.rooms_available_summary,
      suggestedSlot: study.suggested_slot,
      preauthStatus: study.preauth_status,
      preauthCoverage: study.preauth_coverage,
      insurancePlan: study.insurance_plan,
      doctorDhaLicense: study.doctor_dha_license,
      doctorSpecialty: study.doctor_specialty,
      sourceLabel: study.source_label,
    }));

    const equipment: LabPortalEquipment[] = ((equipmentData ?? []) as EquipmentRow[]).map((item) => ({
      id: item.id,
      labId: item.lab_id,
      department: item.department,
      name: item.name,
      equipmentType: item.equipment_type,
      room: item.room,
      status: item.status,
      metricLabel: item.metric_label,
      metricValue: item.metric_value,
      qcStatus: item.qc_status,
      reagentLevelPercent: item.reagent_level_percent,
      alert: item.alert,
      maintenanceDueAt: item.maintenance_due_at,
      subtitle: item.subtitle,
      todayCount: item.today_count,
      uptimePercent: item.uptime_percent,
      qcLotNumber: item.qc_lot_number,
      qcPassedAtLabel: item.qc_passed_at_label,
      reagents: parseReagents(item.reagents),
      activeUserLabel: item.active_user_label,
      activeRemainingLabel: item.active_remaining_label,
    }));

    const qcRuns: LabPortalQcRun[] = ((qcData ?? []) as QcRunRow[]).map((run) => ({
      id: run.id,
      labId: run.lab_id,
      department: run.department,
      instrumentName: run.instrument_name,
      lotNumber: run.lot_number,
      levelLabel: run.level_label,
      resultLabel: run.result_label,
      status: run.status,
      runAt: run.run_at,
    }));

    const nabidhEvents: LabPortalNabidhEvent[] = ((nabidhData ?? []) as NabidhEventRow[]).map((event) => ({
      id: event.id,
      labId: event.lab_id,
      resourceType: event.resource_type,
      referenceCode: event.reference_code,
      patientName: event.patient_name,
      status: event.status,
      reason: event.reason,
      submittedAt: event.submitted_at,
      createdAt: event.created_at,
    }));

    const settingRows = (settingsData ?? []) as SettingRow[];
    let settingOptions: SettingOptionRow[] = [];
    if (settingRows.length > 0) {
      const { data: optionData } = await supabase
        .from('lab_portal_setting_options')
        .select('id, setting_id, label, is_selected, sort_order')
        .in('setting_id', settingRows.map((s) => s.id))
        .order('sort_order', { ascending: true });
      settingOptions = (optionData ?? []) as SettingOptionRow[];
    }
    const optionsBySetting = new Map<string, SettingOptionRow[]>();
    settingOptions.forEach((option) => {
      const existing = optionsBySetting.get(option.setting_id) ?? [];
      existing.push(option);
      optionsBySetting.set(option.setting_id, existing);
    });
    const settings: LabPortalSetting[] = settingRows.map((setting) => ({
      id: setting.id,
      labId: setting.lab_id,
      section: setting.section,
      label: setting.label,
      value: setting.value,
      enabled: setting.enabled,
      options: (optionsBySetting.get(setting.id) ?? []).map((option) => ({
        id: option.id,
        label: option.label,
        isSelected: option.is_selected,
      })),
    }));

    const criticalValues: LabPortalCriticalValue[] = ((criticalData ?? []) as CriticalValueRow[]).map((row) => ({
      id: row.id,
      patientName: row.patient_name,
      testName: row.test_name,
      valueLabel: row.value_label,
      notifiedInMinutes: row.notified_in_minutes,
      status: row.status,
      observedAt: row.observed_at,
    }));

    const topMetrics = ((topMetricsData ?? []) as TopMetricRow[]).map((row) => ({
      id: row.id,
      category: row.category,
      label: row.label,
      value: row.value,
      sortOrder: row.sort_order,
    }));

    const volumeTrends: LabPortalVolumeTrend[] = ((volumeData ?? []) as VolumeTrendRow[]).map((row) => ({
      id: row.id,
      dayLabel: row.day_label,
      labVolume: row.lab_volume,
      radiologyVolume: row.radiology_volume,
      sortOrder: row.sort_order,
    }));

    const startOfToday = todayStartIso();
    const labEquipmentWarnings = equipment.filter((item) => item.department === 'laboratory' && item.status !== 'online').length;
    const imagingEquipmentWarnings = equipment.filter((item) => item.department === 'radiology' && item.status !== 'online').length;
    const pendingNabidh = nabidhEvents.filter((event) => event.status === 'pending' || event.status === 'failed').length;
    const submittedNabidh = nabidhEvents.filter((event) => event.status === 'submitted').length;
    const failedNabidh = nabidhEvents.filter((event) => event.status === 'failed').length;

    return {
      facility,
      facilityMeta,
      samples,
      imagingStudies,
      equipment,
      qcRuns,
      nabidhEvents,
      settings,
      criticalValues,
      topLabTests: topMetrics.filter((m) => m.category === 'lab_test'),
      topImagingStudies: topMetrics.filter((m) => m.category === 'imaging_study'),
      volumeTrends,
      metrics: {
        labQueue: samples.filter((sample) => sample.status !== 'reviewed').length,
        labOrders: samples.filter((sample) => sample.status === 'ordered' || sample.status === 'collected').length,
        labResults: samples.filter((sample) => sample.status === 'resulted' || sample.status === 'reviewed').length,
        qualityWarnings: qcRuns.filter((run) => run.status !== 'passed').length,
        imagingQueue: imagingStudies.filter((study) => study.status !== 'released').length,
        imagingOrders: imagingStudies.filter((study) => study.status === 'ordered' || study.status === 'scheduled').length,
        radiologyReports: imagingStudies.filter((study) => study.status === 'report_pending' || study.status === 'reported').length,
        imagingEquipmentWarnings,
        labEquipmentWarnings,
        nabidhPending: pendingNabidh,
        nabidhSubmitted: submittedNabidh,
        nabidhFailed: failedNabidh,
        criticalUnnotified: criticalValues.filter((c) => c.status === 'pending').length,
        completedToday: samples.filter((sample) => sample.releasedAt && sample.releasedAt >= startOfToday).length,
        sampleCountToday: samples.filter((sample) => sample.orderedAt >= startOfToday).length,
        studyCountToday: imagingStudies.filter((study) => (study.scheduledAt ?? '') >= startOfToday).length,
      },
    };
  }, [memoizedUserId]);
}

export function useLabOpsActions(onChange: () => void) {
  const claimSample = useCallback(
    async (orderId: string) => {
      const { error } = await supabase.rpc('lab_claim_order', { target_order_id: orderId });
      if (error) throw error;
      onChange();
    },
    [onChange],
  );

  const startProcessing = useCallback(
    async (orderId: string) => {
      const { error } = await supabase.rpc('lab_start_processing', { target_order_id: orderId });
      if (error) throw error;
      onChange();
    },
    [onChange],
  );

  const releaseOrder = useCallback(
    async (orderId: string) => {
      const { error } = await supabase.rpc('lab_release_order', { target_order_id: orderId });
      if (error) throw error;
      onChange();
    },
    [onChange],
  );

  const markNabidhSubmitted = useCallback(
    async (eventId: string) => {
      const { error } = await supabase
        .from('lab_portal_nabidh_events')
        .update({ status: 'submitted', submitted_at: new Date().toISOString(), reason: null })
        .eq('id', eventId);
      if (error) throw error;
      onChange();
    },
    [onChange],
  );

  const markNabidhSubmittedBulk = useCallback(
    async (eventIds: string[]) => {
      if (eventIds.length === 0) return;
      const { error } = await supabase
        .from('lab_portal_nabidh_events')
        .update({ status: 'submitted', submitted_at: new Date().toISOString(), reason: null })
        .in('id', eventIds);
      if (error) throw error;
      onChange();
    },
    [onChange],
  );

  return useMemo(
    () => ({ claimSample, startProcessing, releaseOrder, markNabidhSubmitted, markNabidhSubmittedBulk }),
    [claimSample, startProcessing, releaseOrder, markNabidhSubmitted, markNabidhSubmittedBulk],
  );
}
