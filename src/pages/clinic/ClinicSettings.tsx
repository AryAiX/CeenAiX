import { useState } from 'react';
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [clinicName, setClinicName] = useState('Al Noor Medical Center');
  const [clinicType, setClinicType] = useState('Multispecialty Clinic');
  const [license, setLicense] = useState('DHA-FAC-2018-004782');
  const [phone, setPhone] = useState('+971 4 234 5678');
  const [email, setEmail] = useState('admin@alnoor-medical.ae');
  const [address, setAddress] = useState('Dubai Healthcare City, Block A, Unit 204');
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('20:00');
  const [notifAppt, setNotifAppt] = useState(true);
  const [notifPayment, setNotifPayment] = useState(true);
  const [notifLicense, setNotifLicense] = useState(true);
  const [nabidh, setNabidh] = useState(true);

  function toggleDay(d: string) {
    setWorkingDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your clinic's profile and preferences</p>
      </div>

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
        {feedback ? (
          <div className={`rounded-xl border px-4 py-3 text-sm mb-2 ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {feedback.message}
          </div>
        ) : null}
        <button onClick={() => setFeedback({ type: 'success', message: 'Clinic information saved' })} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors">
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
        <button onClick={() => setFeedback({ type: 'success', message: 'Working hours updated' })} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors">
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
      </div>


    </div>
  );
}
