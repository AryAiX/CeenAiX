import i18n from 'i18next';
import type { PrescriptionClinicalVocabRow } from '../lib/prescription-vocab';
import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';

const linkedDispensingTaskFallback = () =>
  i18n.t('pharmacy.queue.linkedDispensingTask', { defaultValue: 'Linked dispensing task' });

export interface PharmacyOrganization {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  notes: string | null;
}

export interface PharmacyFacilityProfile {
  displayName: string;
  licenseNumber: string;
  licenseValidUntil: string | null;
  address: string;
  operatingHours: string;
  pharmacistInCharge: string | null;
  dhaConnected: boolean;
  nabidhConnected: boolean;
  phone: string | null;
  email: string | null;
  website: string | null;
  emergencyContact: string | null;
  workingHoursJson: Record<string, unknown> | null;
  logoUrl: string | null;
  description: string | null;
}

export interface PharmacyStaffMember {
  id: string;
  fullName: string;
  roleTitle: string;
  credentialNumber: string | null;
  shiftStatus: 'on_shift' | 'off_shift' | 'on_call';
}

export interface PharmacyQueuePrescriptionItem {
  id: string;
  /**
   * The prescription this medicine belongs to (QA-251): the real prescription id, so all medicines
   * of one prescription group together. Tasks without a prescription (old demo rows) use their own
   * reference instead.
   */
  prescriptionId: string;
  /** The task's own reference (`external_ref`), one per medicine. */
  externalRef: string;
  /** QA-253: the doctor's prescription line (dosage, frequency, …) this medicine comes from. */
  prescriptionItemId: string | null;
  patientName: string;
  medication: string;
  prescriber: string;
  priority: 'stat' | 'routine' | 'scheduled';
  status: 'verifying' | 'ready' | 'counseling';
  workflowStatus: 'new' | 'in_progress' | 'on_hold' | 'dispensed' | 'picked_up' | 'cancelled';
  waitMinutes: number;
  quantity: number | null;
  isDispensed: boolean;
  insuranceProvider: string;
  copayAed: number;
  receivedAt: string;
  allergyFlag: boolean;
  assignedTo: string | null;
  patientUserId: string | null;
}

export interface PharmacyInventoryDerivedItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  reorderPoint: number;
  expiryMonth: string | null;
  status: 'healthy' | 'low' | 'near_expiry' | 'out';
  genericName: string;
  brandName: string;
  strength: string | null;
  dosageForm: string;
  atcCode: string | null;
  category: string | null;
  unit: string;
  isControlled: boolean;
  isDHAFormulary: boolean;
  batchCount: number;
}

export interface PharmacyClaimLedgerItem {
  id: string;
  dispensingTaskId: string | null;
  externalRef: string;
  patientName: string;
  medication: string;
  payerName: string;
  amountAed: number;
  status: 'paid' | 'review' | 'pending' | 'denied';
  submittedAt: string | null;
  paidAt: string | null;
}

export interface PharmacyMessageThread {
  id: string;
  contactName: string;
  specialty: string;
  messageType: 'doctor' | 'patient' | 'system' | 'dha';
  status: 'awaiting' | 'sent' | 'resolved' | 'info';
  unreadCount: number;
  lastMessage: string;
  contactMessage: string;
  pharmacyResponse: string | null;
  lastMessageAt: string;
}

export interface PharmacySettingItem {
  id: string;
  settingKey: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface PharmacyReportMetrics {
  dispensingAccuracyPercent: number;
  controlledCompliancePercent: number;
  dhaSubmittedCount: number;
  lastSubmittedLabel: string;
}

export interface PharmacyPrescriptionQueueData {
  organization: PharmacyOrganization | null;
  profile: PharmacyFacilityProfile | null;
  staff: PharmacyStaffMember[];
  pendingPrescriptions: number;
  dispensedToday: number;
  lowStockAlerts: number;
  claimsInReview: number;
  queue: PharmacyQueuePrescriptionItem[];
  inventory: PharmacyInventoryDerivedItem[];
  claims: PharmacyClaimLedgerItem[];
  messages: PharmacyMessageThread[];
  settings: PharmacySettingItem[];
  reportMetrics: PharmacyReportMetrics;
}

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  notes: string | null;
}

interface ProfileRow {
  display_name: string;
  license_number: string;
  license_valid_until: string | null;
  address: string;
  operating_hours: string;
  pharmacist_in_charge: string | null;
  dha_connected: boolean;
  nabidh_connected: boolean;
  phone: string | null;
  email: string | null;
  website: string | null;
  emergency_contact: string | null;
  working_hours_json: Record<string, unknown> | null;
  logo_url: string | null;
  description: string | null;
}

interface StaffRow {
  id: string;
  full_name: string;
  role_title: string;
  credential_number: string | null;
  shift_status: 'on_shift' | 'off_shift' | 'on_call';
}

interface DispensingTaskRow {
  id: string;
  prescription_id: string | null;
  prescription_item_id: string | null;
  external_ref: string;
  patient_name: string;
  prescriber_name: string;
  medication_name: string;
  quantity: number | null;
  priority: PharmacyQueuePrescriptionItem['priority'];
  workflow_status: PharmacyQueuePrescriptionItem['workflowStatus'];
  received_at: string;
  insurance_provider: string;
  copay_aed: number | string | null;
  allergy_flag: boolean;
  assigned_to: string | null;
  patient_user_id: string | null;
}

interface InventoryItemRow {
  id: string;
  sku: string;
  generic_name: string;
  brand_name: string;
  strength: string | null;
  dosage_form: string;
  atc_code: string | null;
  category: string | null;
  unit: string;
  reorder_level: number;
  is_controlled: boolean;
  is_dha_formulary: boolean;
}

interface InventoryBatchRow {
  id: string;
  inventory_item_id: string;
  quantity_on_hand: number;
  expiry_date: string | null;
}

interface ClaimRow {
  id: string;
  dispensing_task_id: string | null;
  external_ref: string;
  payer_name: string;
  amount_aed: number | string | null;
  status: PharmacyClaimLedgerItem['status'];
  submitted_at: string | null;
  paid_at: string | null;
}

interface MessageRow {
  id: string;
  contact_name: string;
  specialty: string;
  message_type: PharmacyMessageThread['messageType'];
  status: PharmacyMessageThread['status'];
  unread_count: number;
  last_message: string;
  contact_message: string;
  pharmacy_response: string | null;
  last_message_at: string;
}

interface SettingRow {
  id: string;
  setting_key: string;
  title: string;
  description: string;
  enabled: boolean;
}

const emptyData = (): PharmacyPrescriptionQueueData => ({
  organization: null,
  profile: null,
  staff: [],
  pendingPrescriptions: 0,
  dispensedToday: 0,
  lowStockAlerts: 0,
  claimsInReview: 0,
  queue: [],
  inventory: [],
  claims: [],
  messages: [],
  settings: [],
  reportMetrics: {
    dispensingAccuracyPercent: 0,
    controlledCompliancePercent: 0,
    dhaSubmittedCount: 0,
    lastSubmittedLabel: 'No submissions',
  },
});

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
};

const workflowToQueueStatus = (
  status: PharmacyQueuePrescriptionItem['workflowStatus']
): PharmacyQueuePrescriptionItem['status'] => {
  if (status === 'dispensed' || status === 'picked_up') return 'counseling';
  if (status === 'on_hold' || status === 'cancelled') return 'ready';
  if (status === 'in_progress') return 'verifying';
  return 'verifying';
};

const inventoryStatus = (
  stock: number,
  reorderPoint: number,
  nextExpiry: string | null
): PharmacyInventoryDerivedItem['status'] => {
  if (stock <= 0) return 'out';
  if (nextExpiry) {
    const daysUntilExpiry = Math.ceil((new Date(nextExpiry).getTime() - Date.now()) / 86_400_000);
    if (daysUntilExpiry <= 45) return 'near_expiry';
  }
  if (stock < reorderPoint) return 'low';
  return 'healthy';
};

const formatExpiry = (value: string | null) => {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

/**
 * Toggle a `pharmacy_settings` row's `enabled` boolean. Used by the pharmacy
 * Settings toggles so preference changes are persisted instead of being
 * presentational only.
 */
export async function setPharmacySettingEnabled(
  settingId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('pharmacy_settings')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('id', settingId);
  if (error) throw error;
}

/**
 * Update a pharmacy dispensing task workflow status (`new` / `in_progress` /
 * `on_hold` / `dispensed` / `cancelled`). Wraps the canonical
 * `pharmacy_dispensing_tasks` row write.
 */
/**
 * QA-255: the database refused a change to a dispensing task: the step is not allowed (for example
 * from dispensed back to new), the task belongs to another pharmacy, or another pharmacist changed
 * it first. Nothing was saved.
 */
export class PharmacyTaskChangeNotAllowedError extends Error {
  constructor(detail?: string) {
    super(detail ? `Dispensing task change not allowed: ${detail}` : 'Dispensing task change not allowed');
    this.name = 'PharmacyTaskChangeNotAllowedError';
  }
}

export async function updatePharmacyDispensingTaskStatus(
  taskId: string,
  workflowStatus: PharmacyQueuePrescriptionItem['workflowStatus'],
  options?: { holdReasonCode?: string; holdNote?: string }
): Promise<void> {
  // updated_at is set by the database (QA-255).
  const payload: Record<string, unknown> = {
    workflow_status: workflowStatus,
  };

  if (workflowStatus === 'on_hold') {
    payload.hold_reason_code = options?.holdReasonCode ?? null;
    payload.hold_note = options?.holdNote?.trim() || null;
  } else {
    payload.hold_reason_code = null;
    payload.hold_note = null;
  }

  const { data, error } = await supabase
    .from('pharmacy_dispensing_tasks')
    .update(payload)
    .eq('id', taskId)
    .select('id');
  if (error) {
    // 42501: the database guard refused the step (QA-255).
    if ((error as { code?: string }).code === '42501') {
      throw new PharmacyTaskChangeNotAllowedError(error.message);
    }
    throw error;
  }
  // QA-255: a change refused by the access rules updates 0 rows without an error.
  if (!data || data.length === 0) {
    throw new PharmacyTaskChangeNotAllowedError('0 rows updated');
  }
}

/** QA-254: what reached the patient after a hold. */
export interface PharmacyHoldOutreachResult {
  /** The CeenAiX notification was saved. */
  notified: boolean;
  /** The message from the pharmacy was sent in Messages. */
  messaged: boolean;
}

/**
 * Tells the patient a prescription is on hold: a notification (written by the database, QA-263)
 * and a message from the pharmacy in Messages (QA-254). It never throws: it reports what got
 * through, so the page can say so plainly. Database errors are logged for operators, not shown.
 */
export async function sendPharmacyHoldNotificationAndMessage({
  taskIds,
  patientUserId,
  medications,
  holdReasonLabel,
  holdNote,
  pharmacyUserId,
}: {
  taskIds: string[];
  patientUserId: string;
  medications: string[];
  holdReasonLabel: string;
  holdNote: string;
  pharmacyUserId: string | null;
}): Promise<PharmacyHoldOutreachResult> {
  const medList = medications.slice(0, 2).join(', ');
  const messageBody = `Your prescription for ${medList} has been placed on hold.\n\nReason: ${holdReasonLabel}${holdNote ? `\n\nNote: ${holdNote}` : ''}\n\nPlease contact us if you have any questions.`;
  const result: PharmacyHoldOutreachResult = { notified: false, messaged: false };

  // QA-263: the database writes the patient's notification from the tasks on hold (only a member
  // of that pharmacy may ask); the app can no longer write into another user's inbox.
  const { error: notificationError } = await supabase.rpc('notify_patient_prescription_on_hold', {
    p_task_ids: taskIds,
  });
  if (notificationError) {
    console.warn(`[pharmacy] hold notification failed: ${notificationError.message}`);
  } else {
    result.notified = true;
  }

  if (!pharmacyUserId) return result;

  try {
    // QA-254: the real function is get_or_create_direct_conversation (there is no
    // ensure_direct_conversation) and it returns the conversation id itself. It only lets a
    // pharmacy write to a patient whose prescription it holds.
    const { data: conversationId, error: conversationError } = await supabase.rpc(
      'get_or_create_direct_conversation',
      {
        p_other_user_id: patientUserId,
        p_subject: `Prescription Update - ${medList}`,
      }
    );
    if (conversationError) throw conversationError;
    if (typeof conversationId !== 'string' || !conversationId) {
      throw new Error('No conversation id returned');
    }

    const sentAt = new Date().toISOString();
    const { error: messageError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: pharmacyUserId,
      body: messageBody,
      sent_at: sentAt,
      is_deleted: false,
    });
    if (messageError) throw messageError;
    result.messaged = true;

    // Best effort, like Messages: the message is sent even if the list order is not updated.
    const { error: conversationUpdateError } = await supabase
      .from('conversations')
      .update({ last_message_at: sentAt })
      .eq('id', conversationId);
    if (conversationUpdateError) {
      console.warn(`[pharmacy] hold message sent but conversation time not updated: ${conversationUpdateError.message}`);
    }
  } catch (error) {
    console.warn(`[pharmacy] hold message failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/** QA-253: what the doctor wrote for one medicine, so the pharmacist knows what to dispense. */
export interface PharmacyPrescriptionItemDetail {
  id: string;
  medicationName: string;
  medicationNameAr: string | null;
  dosage: string | null;
  frequency: string | null;
  frequencyCode: string | null;
  duration: string | null;
  durationCode: string | null;
  quantity: number | null;
  instructions: string | null;
}

export interface PharmacyPrescriptionDetails {
  items: PharmacyPrescriptionItemDetail[];
  /** Translated labels for frequency / duration codes; empty if they could not be loaded. */
  vocab: PrescriptionClinicalVocabRow[];
}

interface PrescriptionItemDetailRow {
  id: string;
  medication_name: string;
  medication_name_ar: string | null;
  dosage: string | null;
  frequency: string | null;
  frequency_code: string | null;
  duration: string | null;
  duration_code: string | null;
  quantity: number | null;
  instructions: string | null;
}

const blankToNull = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * QA-253: load the doctor's lines (dosage, frequency, duration, quantity, instructions) for the
 * medicines of one prescription. The pharmacy may read the lines of prescriptions sent to it.
 */
export async function fetchPharmacyPrescriptionDetails(
  prescriptionItemIds: string[]
): Promise<PharmacyPrescriptionDetails> {
  const ids = Array.from(new Set(prescriptionItemIds.filter(Boolean)));
  if (ids.length === 0) {
    return { items: [], vocab: [] };
  }

  const [itemResult, vocabResult] = await Promise.all([
    supabase
      .from('prescription_items')
      .select(
        'id, medication_name, medication_name_ar, dosage, frequency, frequency_code, duration, duration_code, quantity, instructions'
      )
      .in('id', ids),
    supabase.from('prescription_clinical_vocab').select('category, code, label_en, label_ar, legacy_match'),
  ]);

  if (itemResult.error) throw itemResult.error;

  return {
    items: ((itemResult.data ?? []) as PrescriptionItemDetailRow[]).map((row) => ({
      id: row.id,
      medicationName: row.medication_name,
      medicationNameAr: blankToNull(row.medication_name_ar),
      dosage: blankToNull(row.dosage),
      frequency: blankToNull(row.frequency),
      frequencyCode: blankToNull(row.frequency_code),
      duration: blankToNull(row.duration),
      durationCode: blankToNull(row.duration_code),
      quantity: row.quantity,
      instructions: blankToNull(row.instructions),
    })),
    // The labels only translate codes; without them the doctor's own text is shown.
    vocab: vocabResult.error ? [] : ((vocabResult.data ?? []) as PrescriptionClinicalVocabRow[]),
  };
}

/**
 * Persists a pharmacist reply on a `pharmacy_messages` row. The Bolt prototype
 * silently cleared the draft; this writes back to the canonical table so the
 * thread keeps the pharmacy response, marks it as resolved, and clears the
 * unread counter.
 */
export async function sendPharmacyResponse(
  messageId: string,
  body: string
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Message body is empty.');
  }
  const { error } = await supabase
    .from('pharmacy_messages')
    .update({
      pharmacy_response: trimmed,
      status: 'resolved',
      unread_count: 0,
      last_message: trimmed.slice(0, 240),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', messageId);
  if (error) throw error;
}

export function usePharmacyPrescriptionQueue() {
  return useQuery<PharmacyPrescriptionQueueData>(async () => {
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, city, notes')
      .eq('kind', 'pharmacy')
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (orgError) throw orgError;
    if (!organization) return emptyData();

    const org = organization as OrganizationRow;

    const [
      profileResult,
      staffResult,
      taskResult,
      itemResult,
      claimResult,
      messageResult,
      settingResult,
    ] = await Promise.all([
      supabase
        .from('pharmacy_facility_profiles')
        .select('display_name, license_number, license_valid_until, address, operating_hours, pharmacist_in_charge, dha_connected, nabidh_connected, phone, email, website, emergency_contact, working_hours_json, logo_url, description')
        .eq('organization_id', org.id)
        .maybeSingle(),
      supabase
        .from('organization_staff_members')
        .select('id, full_name, role_title, credential_number, shift_status')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('pharmacy_dispensing_tasks')
        .select('id, prescription_id, prescription_item_id, external_ref, patient_name, prescriber_name, medication_name, quantity, priority, workflow_status, received_at, insurance_provider, copay_aed, allergy_flag, assigned_to, patient_user_id')
        .eq('organization_id', org.id)
        .order('received_at', { ascending: false }),
      supabase
        .from('pharmacy_inventory_items')
        .select('id, sku, generic_name, brand_name, strength, dosage_form, atc_code, category, unit, reorder_level, is_controlled, is_dha_formulary')
        .eq('organization_id', org.id)
        .order('generic_name', { ascending: true }),
      supabase
        .from('pharmacy_claims')
        .select('id, dispensing_task_id, external_ref, payer_name, amount_aed, status, submitted_at, paid_at')
        .eq('organization_id', org.id)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('pharmacy_messages')
        .select('id, contact_name, specialty, message_type, status, unread_count, last_message, contact_message, pharmacy_response, last_message_at')
        .eq('organization_id', org.id)
        .order('last_message_at', { ascending: false }),
      supabase
        .from('pharmacy_settings')
        .select('id, setting_key, title, description, enabled')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: true }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (staffResult.error) throw staffResult.error;
    if (taskResult.error) throw taskResult.error;
    if (itemResult.error) throw itemResult.error;
    if (claimResult.error) throw claimResult.error;
    if (messageResult.error) throw messageResult.error;
    if (settingResult.error) throw settingResult.error;

    const inventoryRows = (itemResult.data ?? []) as InventoryItemRow[];
    const inventoryIds = inventoryRows.map((item) => item.id);
    const { data: batchesData, error: batchesError } =
      inventoryIds.length > 0
        ? await supabase
            .from('pharmacy_inventory_batches')
            .select('id, inventory_item_id, quantity_on_hand, expiry_date')
            .in('inventory_item_id', inventoryIds)
        : { data: [], error: null };

    if (batchesError) throw batchesError;

    const batchesByItem = new Map<string, InventoryBatchRow[]>();
    for (const batch of (batchesData ?? []) as InventoryBatchRow[]) {
      batchesByItem.set(batch.inventory_item_id, [...(batchesByItem.get(batch.inventory_item_id) ?? []), batch]);
    }

    const queue = ((taskResult.data ?? []) as DispensingTaskRow[]).map((task): PharmacyQueuePrescriptionItem => {
      const waitMinutes = Math.max(0, Math.round((Date.now() - new Date(task.received_at).getTime()) / 60000));
      return {
        id: task.id,
        // QA-251: group by the real prescription; every medicine has its own external_ref.
        prescriptionId: task.prescription_id ?? task.external_ref,
        externalRef: task.external_ref,
        prescriptionItemId: task.prescription_item_id,
        patientName: task.patient_name,
        medication: task.medication_name,
        prescriber: task.prescriber_name,
        priority: task.priority,
        status: workflowToQueueStatus(task.workflow_status),
        workflowStatus: task.workflow_status,
        waitMinutes,
        quantity: task.quantity,
        isDispensed: task.workflow_status === 'dispensed' || task.workflow_status === 'picked_up',
        insuranceProvider: task.insurance_provider,
        copayAed: toNumber(task.copay_aed),
        receivedAt: task.received_at,
        allergyFlag: task.allergy_flag,
        assignedTo: task.assigned_to,
        patientUserId: task.patient_user_id,
      };
    });

    const queueByTaskId = new Map(queue.map((task) => [task.id, task]));

    const inventory = inventoryRows.map((item): PharmacyInventoryDerivedItem => {
      const batches = batchesByItem.get(item.id) ?? [];
      const stock = batches.reduce((sum, batch) => sum + batch.quantity_on_hand, 0);
      const nextExpiry =
        batches
          .map((batch) => batch.expiry_date)
          .filter((value): value is string => Boolean(value))
          .sort()[0] ?? null;
      const name = [item.generic_name, item.strength].filter(Boolean).join(' ');

      return {
        id: item.id,
        name,
        sku: item.sku,
        stock,
        reorderPoint: item.reorder_level,
        expiryMonth: formatExpiry(nextExpiry),
        status: inventoryStatus(stock, item.reorder_level, nextExpiry),
        genericName: item.generic_name,
        brandName: item.brand_name,
        strength: item.strength,
        dosageForm: item.dosage_form,
        atcCode: item.atc_code,
        category: item.category,
        unit: item.unit,
        isControlled: item.is_controlled,
        isDHAFormulary: item.is_dha_formulary,
        batchCount: batches.length,
      };
    });

    const claims = ((claimResult.data ?? []) as ClaimRow[]).map((claim): PharmacyClaimLedgerItem => {
      const task = claim.dispensing_task_id ? queueByTaskId.get(claim.dispensing_task_id) : undefined;
      return {
        id: claim.id,
        dispensingTaskId: claim.dispensing_task_id,
        externalRef: claim.external_ref,
        patientName: task?.patientName ?? linkedDispensingTaskFallback(),
        medication: task?.medication ?? claim.external_ref,
        payerName: claim.payer_name,
        amountAed: toNumber(claim.amount_aed),
        status: claim.status,
        submittedAt: claim.submitted_at,
        paidAt: claim.paid_at,
      };
    });

    const dispensedCount = queue.filter((item) => item.workflowStatus === 'dispensed').length;
    const controlledCount = inventory.filter((item) => item.isControlled).length;

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        city: org.city,
        notes: org.notes,
      },
      profile: profileResult.data
        ? {
            displayName: (profileResult.data as ProfileRow).display_name,
            licenseNumber: (profileResult.data as ProfileRow).license_number,
            licenseValidUntil: (profileResult.data as ProfileRow).license_valid_until,
            address: (profileResult.data as ProfileRow).address,
            operatingHours: (profileResult.data as ProfileRow).operating_hours,
            pharmacistInCharge: (profileResult.data as ProfileRow).pharmacist_in_charge,
            dhaConnected: (profileResult.data as ProfileRow).dha_connected,
            nabidhConnected: (profileResult.data as ProfileRow).nabidh_connected,
            phone: (profileResult.data as ProfileRow).phone,
            email: (profileResult.data as ProfileRow).email,
            website: (profileResult.data as ProfileRow).website,
            emergencyContact: (profileResult.data as ProfileRow).emergency_contact,
            workingHoursJson: (profileResult.data as ProfileRow).working_hours_json,
            logoUrl: (profileResult.data as ProfileRow).logo_url,
            description: (profileResult.data as ProfileRow).description,
          }
        : null,
      staff: ((staffResult.data ?? []) as StaffRow[]).map((staff) => ({
        id: staff.id,
        fullName: staff.full_name,
        roleTitle: staff.role_title,
        credentialNumber: staff.credential_number,
        shiftStatus: staff.shift_status,
      })),
      pendingPrescriptions: queue.filter((item) => item.workflowStatus !== 'dispensed' && item.workflowStatus !== 'cancelled').length,
      dispensedToday: dispensedCount,
      lowStockAlerts: inventory.filter((item) => item.status === 'low' || item.status === 'out' || item.status === 'near_expiry').length,
      claimsInReview: claims.filter((claim) => claim.status === 'review').length,
      queue,
      inventory,
      claims,
      messages: ((messageResult.data ?? []) as MessageRow[]).map((message) => ({
        id: message.id,
        contactName: message.contact_name,
        specialty: message.specialty,
        messageType: message.message_type,
        status: message.status,
        unreadCount: message.unread_count,
        lastMessage: message.last_message,
        contactMessage: message.contact_message,
        pharmacyResponse: message.pharmacy_response,
        lastMessageAt: message.last_message_at,
      })),
      settings: ((settingResult.data ?? []) as SettingRow[]).map((setting) => ({
        id: setting.id,
        settingKey: setting.setting_key,
        title: setting.title,
        description: setting.description,
        enabled: setting.enabled,
      })),
      reportMetrics: {
        dispensingAccuracyPercent: queue.length ? Math.round((dispensedCount / queue.length) * 1000) / 10 : 0,
        controlledCompliancePercent: controlledCount > 0 ? 100 : 0,
        dhaSubmittedCount: queue.length,
        lastSubmittedLabel: queue.length > 0 ? 'Today' : 'No submissions',
      },
    };
  }, []);
}
