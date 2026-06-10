import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, CreditCard as Edit2, Trash2, DollarSign, Clock, X, Save, ToggleLeft, ToggleRight, Search } from 'lucide-react';

interface PricingItem {
  id: string;
  name: string;
  category: string;
  doctor: string | null;
  durationMinutes: number;
  priceAed: number;
  description: string;
  isActive: boolean;
}

const categories = ['All', 'Consultation', 'Follow-up', 'Procedure', 'Telemedicine', 'Lab', 'Imaging', 'Package'];
const doctors = ['Any Doctor', 'Dr. Fatima Hassan', 'Dr. Khalid Nasser', 'Dr. Tooraj Helmi', 'Dr. Aisha Al Mansoori'];

const mockPricing: PricingItem[] = [
  { id: '1', name: 'Cardiology Consultation', category: 'Consultation', doctor: 'Dr. Fatima Hassan', durationMinutes: 45, priceAed: 800, description: 'Initial or follow-up cardiology appointment', isActive: true },
  { id: '2', name: 'General Checkup', category: 'Consultation', doctor: null, durationMinutes: 30, priceAed: 300, description: 'Routine health check, vital signs, and basic examination', isActive: true },
  { id: '3', name: 'Diabetes Management', category: 'Follow-up', doctor: 'Dr. Fatima Hassan', durationMinutes: 30, priceAed: 600, description: 'HbA1c review, insulin management, dietary guidance', isActive: true },
  { id: '4', name: 'Follow-up Visit', category: 'Follow-up', doctor: null, durationMinutes: 20, priceAed: 400, description: 'Standard follow-up for existing patients', isActive: true },
  { id: '5', name: 'Telemedicine Consultation', category: 'Telemedicine', doctor: null, durationMinutes: 20, priceAed: 200, description: 'Video call with a doctor for minor complaints', isActive: true },
  { id: '6', name: 'Endocrinology Consultation', category: 'Consultation', doctor: 'Dr. Aisha Al Mansoori', durationMinutes: 45, priceAed: 700, description: 'Hormonal and metabolic disorder assessment', isActive: true },
  { id: '7', name: 'Internal Medicine Consultation', category: 'Consultation', doctor: 'Dr. Khalid Nasser', durationMinutes: 40, priceAed: 600, description: 'Comprehensive internal medicine evaluation', isActive: true },
  { id: '8', name: 'Lab Results Review', category: 'Follow-up', doctor: null, durationMinutes: 15, priceAed: 200, description: 'Doctor review and explanation of laboratory results', isActive: true },
  { id: '9', name: 'Comprehensive Health Package', category: 'Package', doctor: null, durationMinutes: 90, priceAed: 1200, description: 'Full checkup + ECG + basic labs + doctor consultation', isActive: false },
  { id: '10', name: 'ECG Interpretation', category: 'Procedure', doctor: 'Dr. Fatima Hassan', durationMinutes: 20, priceAed: 350, description: '12-lead ECG with cardiologist interpretation', isActive: true },
];

function PricingModal({ item, onClose, onSave }: { item?: PricingItem; onClose: () => void; onSave: (p: Partial<PricingItem>) => void }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || 'Consultation',
    doctor: item?.doctor || 'Any Doctor',
    durationMinutes: String(item?.durationMinutes || 30),
    priceAed: String(item?.priceAed || ''),
    description: item?.description || '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center"><DollarSign size={18} className="text-teal-600" /></div>
            <h3 className="font-bold text-slate-900">{isEdit ? 'Edit Service' : 'Add New Service'}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Service Name</label>
            <input type="text" value={form.name} onChange={set('name')} placeholder="e.g. Cardiology Consultation" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select value={form.category} onChange={set('category')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Doctor</label>
              <select value={form.doctor} onChange={set('doctor')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                {doctors.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Duration (minutes)</label>
              <input type="number" value={form.durationMinutes} onChange={set('durationMinutes')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Price (AED)</label>
              <input type="number" value={form.priceAed} onChange={set('priceAed')} placeholder="0" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Brief description of this service…" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">Cancel</button>
          <button
            onClick={() => {
              onSave({ ...form, durationMinutes: Number(form.durationMinutes), priceAed: Number(form.priceAed), doctor: form.doctor === 'Any Doctor' ? null : form.doctor });
              onClose();
            }}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Save size={15} /> {isEdit ? 'Save Changes' : 'Add Service'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ClinicPricing() {
  const [items, setItems] = useState<PricingItem[]>(mockPricing);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PricingItem | undefined>(undefined);

  const filtered = items.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalActive = items.filter(p => p.isActive).length;
  const avgPrice = Math.round(items.filter(p => p.isActive).reduce((s, p) => s + p.priceAed, 0) / (totalActive || 1));
  const maxPrice = Math.max(...items.map(p => p.priceAed));

  function handleSave(data: Partial<PricingItem>) {
    if (editItem) {
      setItems(prev => prev.map(p => p.id === editItem.id ? { ...p, ...data } : p));
    } else {
      setItems(prev => [...prev, { id: Date.now().toString(), isActive: true, ...data } as PricingItem]);
    }
    setEditItem(undefined);
  }

  function toggleActive(id: string) {
    setItems(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Pricing & Services</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage your clinic's services and consultation fees</p>
        </div>
        <button
          onClick={() => { setEditItem(undefined); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Service
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Services', value: items.length, icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Active Services', value: totalActive, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg. Price (AED)', value: avgPrice.toLocaleString(), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Highest Fee (AED)', value: maxPrice.toLocaleString(), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}><Icon size={18} className={k.color} /></div>
              <div>
                <div className="text-xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services…" className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterCat === c ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(p => (
          <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${p.isActive ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-100">{p.category}</span>
                  {!p.isActive && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">Inactive</span>}
                </div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">{p.name}</h3>
                {p.doctor && <p className="text-xs text-slate-400 mt-0.5">{p.doctor}</p>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-teal-700" style={{ fontFamily: 'DM Mono, monospace' }}>
                  {p.priceAed.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">AED</div>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">{p.description}</p>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock size={12} />
                {p.durationMinutes} min
              </div>
              <div className="w-px h-3 bg-slate-200" />
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${(p.priceAed / maxPrice) * 100}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => toggleActive(p.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${p.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {p.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {p.isActive ? 'Active' : 'Inactive'}
              </button>
              <button
                onClick={() => { setEditItem(p); setShowModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors ml-auto"
              >
                <Edit2 size={12} /> Edit
              </button>
              <button onClick={() => deleteItem(p.id)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400">
          <DollarSign size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No services found.</p>
        </div>
      )}

      {showModal && <PricingModal item={editItem} onClose={() => { setShowModal(false); setEditItem(undefined); }} onSave={handleSave} />}
    </div>
  );
}
