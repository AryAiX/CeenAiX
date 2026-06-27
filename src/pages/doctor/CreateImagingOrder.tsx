import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Scan } from 'lucide-react';
import { useDoctorPatients, useQuery } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { appointmentPickerLabel } from '../../lib/i18n-ui';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { supabase } from '../../lib/supabase';

const MODALITIES = ['MRI', 'CT', 'X-Ray', 'Ultrasound', 'Echo'] as const;
type Modality = (typeof MODALITIES)[number];

const STUDY_NAMES: Record<Modality, string[]> = {
  MRI: ['MRI Brain', 'MRI Spine', 'MRI Knee', 'MRI Abdomen', 'MRI Pelvis', 'MRI Shoulder', 'MRI Whole Body', 'Other'],
  CT: ['CT Brain', 'CT Chest', 'CT Abdomen & Pelvis', 'CT Spine', 'CT Angiography', 'CT Sinuses', 'Other'],
  'X-Ray': ['Chest X-Ray', 'Abdomen X-Ray', 'Hand X-Ray', 'Foot X-Ray', 'Knee X-Ray', 'Spine X-Ray', 'Other'],
  Ultrasound: ['Abdominal Ultrasound', 'Pelvic Ultrasound', 'Thyroid Ultrasound', 'Breast Ultrasound', 'Renal Ultrasound', 'Doppler Study', 'Other'],
  Echo: ['Echocardiogram', 'Stress Echocardiogram', 'Transesophageal Echo', 'Other'],
};

const CONTRAST_OPTIONS = ['No', 'With Contrast', 'With and Without Contrast'] as const;
const PRIORITY_OPTIONS = ['Routine', 'Urgent', 'STAT'] as const;

export const CreateImagingOrder: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data: patientsData } = useDoctorPatients(user?.id);
  const patients = useMemo(() => patientsData ?? [], [patientsData]);

  const [patientId, setPatientId] = useState(searchParams.get('patient') ?? '');
  const [appointmentId, setAppointmentId] = useState(searchParams.get('appointment') ?? '');
  const [modality, setModality] = useState<Modality>('MRI');
  const [studyName, setStudyName] = useState('');
  const [customStudyName, setCustomStudyName] = useState('');
  const [priority, setPriority] = useState<'Routine' | 'Urgent' | 'STAT'>('Routine');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [contrast, setContrast] = useState<string>('No');
  const [prepInstructions, setPrepInstructions] = useState('');
  const [icd10Code, setIcd10Code] = useState('');
  const [icd10Description, setIcd10Description] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const { data: appointmentsData } = useQuery<
    Array<{ id: string; scheduled_at: string; chief_complaint: string | null }>
  >(
    async () => {
      if (!user?.id || !patientId) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, scheduled_at, chief_complaint')
        .eq('doctor_id', user.id)
        .eq('patient_id', patientId)
        .eq('is_deleted', false)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    [user?.id ?? '', patientId]
  );

  const appointments = useMemo(() => appointmentsData ?? [], [appointmentsData]);
  const selectedAppointment = useMemo(
    () => appointments.find((a) => a.id === appointmentId) ?? null,
    [appointmentId, appointments]
  );

  const hasUnsavedChanges = clinicalIndication.trim() || studyName || customStudyName.trim();

  const handleNavigateAway = (to: string) => {
    if (hasUnsavedChanges) {
      setShowLeaveConfirm(true);
    } else {
      navigate(to);
    }
  };

  const finalStudyName = studyName === 'Other' ? customStudyName.trim() : studyName;

  const submit = async () => {
    setShowValidationErrors(true);
    if (!user?.id || !patientId) {
      setFeedback({ type: 'error', message: 'Please select a patient.' });
      return;
    }
    if (!finalStudyName) {
      setFeedback({ type: 'error', message: 'Please select or enter a study name.' });
      return;
    }
    if (!clinicalIndication.trim()) {
      setFeedback({ type: 'error', message: 'Clinical indication is required.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const { error } = await supabase.rpc('doctor_create_imaging_order', {
        p_patient_id: patientId,
        p_appointment_id: appointmentId || null,
        p_modality: modality,
        p_study_name: finalStudyName,
        p_priority: priority,
        p_clinical_indication: clinicalIndication.trim(),
        p_contrast: contrast,
        p_prep_instructions: prepInstructions.trim() || null,
        p_icd10_code: icd10Code.trim() || null,
        p_icd10_description: icd10Description.trim() || null,
        p_scheduled_at: scheduledAt || null,
        p_clinic_name: clinicName.trim() || null,
      });
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: patientId,
        type: 'system',
        title: 'New imaging order created',
        body: `Your doctor has requested a ${modality} — ${finalStudyName}. Please contact the imaging center to schedule your appointment.`,
        action_url: '/patient/imaging',
      });

      setSaving(false);
      setShowValidationErrors(false);
      setFeedback({ type: 'success', message: 'Imaging order submitted successfully.' });
      setTimeout(() => navigate('/doctor/imaging'), 1500);
    } catch (error) {
      setSaving(false);
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit imaging order.',
      });
    }
  };

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => handleNavigateAway('/doctor/imaging')}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Imaging
        </button>
        <h1 className="text-2xl font-bold text-slate-900">New Imaging Order</h1>
        <p className="mt-1 text-sm text-slate-500">Submit a radiology or imaging request directly to the imaging center.</p>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-6">
        {feedback ? (
          <div
            role="alert"
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        {/* Patient & Appointment */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Patient</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">Patient <span className="text-red-500">*</span></span>
              <select
                value={patientId}
                onChange={(e) => { setPatientId(e.target.value); setAppointmentId(''); }}
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                  showValidationErrors && !patientId
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                }`}
              >
                <option value="">Select patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {showValidationErrors && !patientId ? (
                <p className="mt-1.5 text-xs font-medium text-red-600">⚠️ Please select a patient</p>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">Appointment (optional)</span>
              <select
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">Select appointment…</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>{appointmentPickerLabel('en', a.scheduled_at)}</option>
                ))}
              </select>
              {selectedAppointment ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">{appointmentPickerLabel('en', selectedAppointment.scheduled_at)}</p>
                  <p className="mt-1">{selectedAppointment.chief_complaint?.trim() || 'No chief complaint'}</p>
                </div>
              ) : null}
            </label>
          </div>
        </div>

        {/* Modality */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Modality <span className="text-red-500">*</span></h2>
          <div className="flex flex-wrap gap-3">
            {MODALITIES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setModality(m); setStudyName(''); setCustomStudyName(''); }}
                className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                  modality === m
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50'
                }`}
              >
                {m === 'MRI' ? '🧲 MRI' : m === 'CT' ? '🔬 CT' : m === 'X-Ray' ? '☢️ X-Ray' : m === 'Ultrasound' ? '🔊 Ultrasound' : '❤️ Echo'}
              </button>
            ))}
          </div>
          {['MRI', 'CT', 'PET-CT'].includes(modality) ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              ⚠️ Pre-authorization will be automatically required for {modality} orders.
            </div>
          ) : null}
        </div>

        {/* Study Details */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Study Details</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">Study Name <span className="text-red-500">*</span></span>
              <select
                value={studyName}
                onChange={(e) => { setStudyName(e.target.value); setCustomStudyName(''); }}
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                  showValidationErrors && !finalStudyName
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                }`}
              >
                <option value="">Select study…</option>
                {STUDY_NAMES[modality].map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {studyName === 'Other' ? (
                <input
                  type="text"
                  value={customStudyName}
                  onChange={(e) => setCustomStudyName(e.target.value)}
                  placeholder="Enter study name…"
                  maxLength={FORM_FIELD_LIMITS.shortText}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              ) : null}
              {showValidationErrors && !finalStudyName ? (
                <p className="mt-1.5 text-xs font-medium text-red-600">⚠️ Please select or enter a study name</p>
              ) : null}
            </label>

            <div>
              <span className="mb-2 block text-sm font-semibold text-slate-900">Priority</span>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      priority === p
                        ? p === 'STAT' ? 'bg-red-600 text-white' : p === 'Urgent' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p === 'STAT' ? '⚡ STAT' : p === 'Urgent' ? '⚡ Urgent' : '📋 Routine'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-sm font-semibold text-slate-900">Contrast</span>
              <div className="flex flex-wrap gap-2">
                {CONTRAST_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setContrast(c)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      contrast === c
                        ? c === 'No' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Information */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Clinical Information</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">Clinical Indication <span className="text-red-500">*</span></span>
              <textarea
                value={clinicalIndication}
                onChange={(e) => setClinicalIndication(e.target.value)}
                placeholder="Why is this imaging study needed? Describe symptoms, clinical findings, or suspected diagnosis…"
                maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                rows={3}
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                  showValidationErrors && !clinicalIndication.trim()
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                }`}
              />
              {showValidationErrors && !clinicalIndication.trim() ? (
                <p className="mt-1.5 text-xs font-medium text-red-600">⚠️ Clinical indication is required</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">Prep Instructions (optional)</span>
              <input
                type="text"
                value={prepInstructions}
                onChange={(e) => setPrepInstructions(e.target.value)}
                placeholder="e.g. Fasting required 4 hours before, remove metallic objects…"
                maxLength={FORM_FIELD_LIMITS.shortText}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">ICD-10 Code (optional)</span>
                <input
                  type="text"
                  value={icd10Code}
                  onChange={(e) => setIcd10Code(e.target.value)}
                  placeholder="e.g. M54.5"
                  maxLength={FORM_FIELD_LIMITS.icdCode}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">ICD-10 Description (optional)</span>
                <input
                  type="text"
                  value={icd10Description}
                  onChange={(e) => setIcd10Description(e.target.value)}
                  placeholder="e.g. Low back pain"
                  maxLength={FORM_FIELD_LIMITS.shortText}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">Clinic / Practice Name (optional)</span>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. Dubai Medical Centre"
                maxLength={FORM_FIELD_LIMITS.shortText}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
          </div>
        </div>

        {/* Scheduling */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Preferred Scheduling</h2>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-900">Preferred Date & Time (optional)</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
            <p className="mt-1.5 text-xs text-slate-500">The imaging center will confirm the final appointment time.</p>
          </label>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleNavigateAway('/doctor/imaging')}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
            <span>{saving ? 'Submitting…' : 'Submit Imaging Order'}</span>
          </button>
        </div>
      </div>

      {showLeaveConfirm ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-5">
              <h3 className="text-lg font-bold text-slate-900">Leave without saving?</h3>
              <p className="mt-2 text-sm text-slate-500">
                You have unsaved changes. If you leave now your work will be lost.
              </p>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => navigate('/doctor/imaging')}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Leave Anyway
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
};
