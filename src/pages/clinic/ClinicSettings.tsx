import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { Building2, Clock, Bell, Shield, Save } from 'lucide-react';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-teal-500' : 'bg-slate-200'}`}
    >
      <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
    </button>
  );
}

export default function ClinicSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [clinicName, setClinicName] = useState('');
  const [clinicType, setClinicType] = useState('');
  const [license, setLicense] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('20:00');
  const [notifAppt, setNotifAppt] = useState(true);
  const [notifPayment, setNotifPayment] = useState(true);
  const [notifLicense, setNotifLicense] = useState(true);
  const [nabidh, setNabidh] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('clinic_portal_members')
        .select('facility_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData?.facility_id) throw new Error('No clinic facility found.');
      const fId = memberData.facility_id;
      setFacilityId(fId);

      const { data: facilityData, error: facilityError } = await supabase
        .from('facilities')
        .select('name, facility_type, license_number, phone, email, address, operating_hours, settings')
        .eq('id', fId)
        .maybeSingle();

      if (facilityError) throw facilityError;
      if (facilityData) {
        setClinicName(facilityData.name ?? '');
        setClinicType(facilityData.facility_type ?? '');
        setLicense(facilityData.license_number ?? '');
        setPhone(facilityData.phone ?? '');
        setEmail(facilityData.email ?? '');
        setAddress(facilityData.address ?? '');
        if (facilityData.operating_hours) {
          const hours = facilityData.operating_hours as Record<string, string>;
          const dayMap: Record<string, string> = {
            mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
            thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
          };
          const activeDays = Object.keys(hours).map(k => dayMap[k]).filter(Boolean);
          setWorkingDays(activeDays);
          const firstValue = Object.values(hours)[0];
          if (firstValue) {
            const [open, close] = firstValue.split('-');
            if (open) setOpenTime(open);
            if (close) setCloseTime(close);
          }
        }
        if (facilityData.settings) {
          const s = facilityData.settings as Record<string, boolean>;
          if (s.notifAppt !== undefined) setNotifAppt(s.notifAppt);
          if (s.notifPayment !== undefined) setNotifPayment(s.notifPayment);
          if (s.notifLicense !== undefined) setNotifLicense(s.notifLicense);
          if (s.nabidh !== undefined) setNabidh(s.nabidh);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clinic settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClinicInfo = async () => {
    if (!facilityId) return;
    setFeedback(null);
    try {
      const { error: updateError } = await supabase
        .from('facilities')
        .update({
          name: clinicName,
          facility_type: clinicType,
          license_number: license,
          phone: phone,
          email: email,
          address: address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', facilityId);

      if (updateError) throw updateError;
      setFeedback({ type: 'success', message: 'Clinic information saved successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save changes.' });
    }
  };

  const handleSaveNotifications = async () => {
    if (!facilityId) return;
    setFeedback(null);
    try {
      const { error: updateError } = await supabase
        .from('facilities')
        .update({
          settings: {
            notifAppt,
            notifPayment,
            notifLicense,
            nabidh,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', facilityId);

      if (updateError) throw updateError;
      setFeedback({ type: 'success', message: 'Settings saved successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save settings.' });
    }
  };

  const handleSaveHours = async () => {
    if (!facilityId) return;
    setFeedback(null);
    try {
      const dayMap: Record<string, string> = {
        Monday: 'mon', Tuesday: 'tue', Wednesday: 'wed',
        Thursday: 'thu', Friday: 'fri', Saturday: 'sat', Sunday: 'sun',
      };
      const operatingHours: Record<string, string> = {};
      workingDays.forEach(day => {
        const key = dayMap[day];
        if (key) operatingHours[key] = `${openTime}-${closeTime}`;
      });

      const { error: updateError } = await supabase
        .from('facilities')
        .update({
          operating_hours: operatingHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', facilityId);

      if (updateError) throw updateError;
      setFeedback({ type: 'success', message: 'Working hours saved successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save hours.' });
    }
  };

  function toggleDay(d: string) {
    setWorkingDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-3xl animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => void fetchData()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      ) : null}

      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your clinic's profile and preferences</p>
      </div>

      {feedback ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      ) : null}

      {/* Clinic info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center"><Building2 size={18} className="text-teal-600" /></div>
          <div className="font-bold text-slate-800">Clinic Information</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Clinic Name', value: clinicName, set: setClinicName },
            { label: 'Clinic Type', value: clinicType, set: setClinicType },
            { label: 'DHA Facility License', value: license, set: setLicense },
            { label: 'Phone', value: phone, set: setPhone },
            { label: 'Email', value: email, set: setEmail },
          ].map(f => (
            <div key={f.label} className={f.label === 'Clinic Name' ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
              <input type="text" value={f.value} onChange={e => f.set(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>
        <button
          onClick={() => void handleSaveClinicInfo()}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Save size={15} /> Save Changes
        </button>
      </div>

      {/* Working hours */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center"><Clock size={18} className="text-blue-600" /></div>
          <div className="font-bold text-slate-800">Working Hours</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-2">Working Days</div>
          <div className="flex flex-wrap gap-2">
            {days.map(d => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${workingDays.includes(d) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >{d.slice(0, 3)}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Opening Time</label>
            <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Closing Time</label>
            <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>
        <button
          onClick={() => void handleSaveHours()}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Save size={15} /> Save Hours
        </button>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center"><Bell size={18} className="text-amber-600" /></div>
          <div className="font-bold text-slate-800">Notifications</div>
        </div>
        {[
          { label: 'Appointment reminders', sub: 'Notify 24 hours before scheduled appointments', val: notifAppt, set: setNotifAppt },
          { label: 'Payment confirmations', sub: 'Get notified when a payment is received', val: notifPayment, set: setNotifPayment },
          { label: 'License expiry alerts', sub: 'Warn 30 days before any DHA license expires', val: notifLicense, set: setNotifLicense },
        ].map(n => (
          <div key={n.label} className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-800">{n.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{n.sub}</div>
            </div>
            <Toggle checked={n.val} onChange={n.set} />
          </div>
        ))}
        <button
          onClick={() => void handleSaveNotifications()}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Save size={15} /> Save Notifications
        </button>
      </div>

      {/* NABIDH */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center"><Shield size={18} className="text-emerald-600" /></div>
          <div className="font-bold text-slate-800">NABIDH Integration</div>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Enable NABIDH data sync</div>
            <div className="text-xs text-slate-400 mt-0.5">Sync patient records with the UAE national health exchange</div>
          </div>
          <Toggle checked={nabidh} onChange={setNabidh} />
        </div>
        {nabidh && (
          <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-700 font-medium flex items-center gap-2">
            ✅ NABIDH sync is active — records are being submitted automatically
          </div>
        )}
        <button
          onClick={() => void handleSaveNotifications()}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Save size={15} /> Save NABIDH Settings
        </button>
      </div>


    </div>
  );
}
