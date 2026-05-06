import React, { useState } from 'react';
import { Building2, FlaskConical, ScanLine, FileText, Settings, CheckCircle2, Award, User, Cpu, Shield, Plus } from 'lucide-react';

type ProfileTab = 'facility' | 'lab-accreditation' | 'rad-accreditation' | 'test-menu' | 'settings';
type MenuTab = 'lab-tests' | 'imaging-studies';

const IMAGING_STUDIES = [
  { name: 'MRI Brain', modality: 'MRI', prep: 'Remove metal objects', contrast: 'Optional Gadovist', cpt: 'CPT-70553', price: 'AED 1,800', tat: '4h', coverage: 'Daman/ADNIC' },
  { name: 'MRI Lumbar Spine', modality: 'MRI', prep: 'No special prep', contrast: 'None', cpt: 'CPT-72148', price: 'AED 1,600', tat: '4h', coverage: 'All' },
  { name: 'CT Chest', modality: 'CT', prep: 'Fasting 4h', contrast: 'Optional IV', cpt: 'CPT-71250', price: 'AED 1,200', tat: '3h', coverage: 'All' },
  { name: 'CT Abdomen + Pelvis', modality: 'CT', prep: 'Fasting 4h, contrast consent', contrast: 'IV + Oral required', cpt: 'CPT-74177', price: 'AED 1,400', tat: '3h', coverage: 'Daman/Thiqa' },
  { name: 'X-Ray Chest', modality: 'XR', prep: 'None', contrast: 'None', cpt: 'CPT-71046', price: 'AED 180', tat: '1h', coverage: 'All' },
  { name: 'USS Abdomen', modality: 'USS', prep: 'Fasting 6h', contrast: 'None', cpt: 'CPT-76700', price: 'AED 450', tat: '2h', coverage: 'All' },
  { name: 'Obstetric USS', modality: 'USS', prep: 'Full bladder', contrast: 'None', cpt: 'CPT-76805', price: 'AED 600', tat: '2h', coverage: 'All' },
  { name: 'Mammography', modality: 'MAMMO', prep: 'No deodorant', contrast: 'None', cpt: 'CPT-77067', price: 'AED 700', tat: '4h', coverage: 'Daman/Thiqa' },
  { name: 'PET-CT Oncology', modality: 'PET', prep: 'Fasting 6h, FDG injection 1h prior', contrast: 'FDG radiotracer', cpt: 'CPT-78816', price: 'AED 5,500', tat: '48h', coverage: 'Thiqa/Special' },
  { name: 'Echocardiogram', modality: 'ECHO', prep: 'None', contrast: 'Optional', cpt: 'CPT-93306', price: 'AED 900', tat: '2h', coverage: 'All' },
];

const MOD_STYLE: Record<string, { bg: string; color: string }> = {
  MRI:   { bg: '#EEF2FF', color: '#4F46E5' },
  CT:    { bg: '#EFF6FF', color: '#1D4ED8' },
  XR:    { bg: '#F8FAFC', color: '#475569' },
  USS:   { bg: '#F0FDFA', color: '#0D9488' },
  MAMMO: { bg: '#FFF1F2', color: '#BE185D' },
  PET:   { bg: '#FFFBEB', color: '#B45309' },
  ECHO:  { bg: '#F5F3FF', color: '#7C3AED' },
};

const LAB_TESTS = [
  { name: 'Complete Blood Count (CBC)', dept: 'Haematology', tat: '1h', cpt: 'CPT-85025', price: 'AED 85' },
  { name: 'Comprehensive Metabolic Panel', dept: 'Chemistry', tat: '2h', cpt: 'CPT-80053', price: 'AED 220' },
  { name: 'Troponin I (High Sensitivity)', dept: 'Chemistry', tat: '30min', cpt: 'CPT-84484', price: 'AED 180' },
  { name: 'HbA1c', dept: 'Chemistry', tat: '2h', cpt: 'CPT-83036', price: 'AED 130' },
  { name: 'Lipid Profile', dept: 'Chemistry', tat: '2h', cpt: 'CPT-80061', price: 'AED 150' },
  { name: 'TSH + Free T4', dept: 'Immunology', tat: '4h', cpt: 'CPT-84443', price: 'AED 170' },
  { name: 'PT/INR + APTT', dept: 'Coagulation', tat: '2h', cpt: 'CPT-85610', price: 'AED 120' },
  { name: 'Urine Culture + Sensitivity', dept: 'Microbiology', tat: '48h', cpt: 'CPT-87086', price: 'AED 200' },
];

const ProfilePage: React.FC = () => {
  const [tab, setTab] = useState<ProfileTab>('facility');
  const [menuTab, setMenuTab] = useState<MenuTab>('lab-tests');

  const TABS: { id: ProfileTab; icon: React.FC<{ style?: React.CSSProperties }>; label: string }[] = [
    { id: 'facility',          icon: Building2, label: 'Facility Info' },
    { id: 'lab-accreditation', icon: FlaskConical, label: 'Lab Accreditation' },
    { id: 'rad-accreditation', icon: ScanLine, label: 'Radiology Accreditation' },
    { id: 'test-menu',         icon: FileText, label: 'Test & Imaging Menu' },
    { id: 'settings',          icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col" style={{ background: '#F8FAFC' }}>
      {/* Page header */}
      <div className="flex-shrink-0 px-6 py-5" style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-3 mb-1">
          <Building2 style={{ width: 20, height: 20, color: '#4F46E5' }} />
          <h1 className="font-black text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20 }}>Lab & Radiology Profile</h1>
        </div>
        <div className="text-slate-500" style={{ fontSize: 12 }}>Lab & Radiology Portal › Profile · Dubai Medical & Imaging Centre</div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all"
                style={{ fontSize: 12, background: tab === t.id ? '#4F46E5' : 'transparent', color: tab === t.id ? '#fff' : '#64748B', border: `1px solid ${tab === t.id ? '#4F46E5' : '#E2E8F0'}` }}>
                <Icon style={{ width: 13, height: 13 }} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'none' }}>
        {/* FACILITY INFO */}
        {tab === 'facility' && (
          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="font-black text-slate-900 mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>Facility Information</div>
              <div className="space-y-3">
                {[
                  { label: 'Facility Name (EN)', value: 'Dubai Medical & Imaging Centre' },
                  { label: 'Facility Name (AR)', value: 'مركز دبي للتشخيص والتصوير الطبي' },
                  { label: 'Location', value: 'Building 64, Healthcare City, Dubai, UAE' },
                  { label: 'DHA Lab License', value: 'DHA-LAB-2015-002841' },
                  { label: 'DHA Radiology License', value: 'DHA-RAD-2016-001247' },
                  { label: 'Operating Hours', value: 'Sunday–Thursday 7:00 AM – 8:00 PM' },
                  { label: 'Emergency Lab', value: '24/7 on-call' },
                ].map(r => (
                  <div key={r.label} className="flex items-start justify-between py-2" style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>{r.label}</span>
                    <span className="font-semibold text-slate-800 text-right" style={{ fontSize: 12, maxWidth: '55%' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="rounded-2xl p-5 mb-4" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
                <div className="font-bold text-slate-800 mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>Accreditations</div>
                {[
                  { label: 'CAP Accredited', desc: 'College of American Pathologists', ok: true },
                  { label: 'ISO 15189:2022', desc: 'Medical Laboratory Quality Management', ok: true },
                  { label: 'JCI Accredited', desc: 'Joint Commission International', ok: true },
                  { label: 'CBAHI', desc: 'Central Board for Accreditation', ok: true },
                ].map(a => (
                  <div key={a.label} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <CheckCircle2 style={{ width: 16, height: 16, color: '#10B981', flexShrink: 0 }} />
                    <div>
                      <div className="font-semibold text-slate-800" style={{ fontSize: 12 }}>{a.label}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>{a.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-5" style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                <div className="font-bold text-indigo-900 mb-3" style={{ fontSize: 14 }}>License Renewal</div>
                {[
                  { label: 'DHA Lab License', date: 'Expires Aug 2026', warn: false },
                  { label: 'DHA Rad License', date: 'Expires Nov 2026', warn: false },
                  { label: 'CAP Accreditation', date: 'Renewal: Oct 2026', warn: true },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-1.5">
                    <span style={{ fontSize: 12, color: '#4F46E5' }}>{r.label}</span>
                    <span style={{ fontSize: 11, color: r.warn ? '#F59E0B' : '#10B981', fontWeight: 600 }}>{r.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LAB ACCREDITATION */}
        {tab === 'lab-accreditation' && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical style={{ width: 16, height: 16, color: '#4F46E5' }} />
                <span className="font-black text-indigo-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>Laboratory Accreditation</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  { label: 'DHA Lab License', value: 'DHA-LAB-2015-002841', icon: Shield },
                  { label: 'CAP Number', value: 'CAP-8742193', icon: Award },
                  { label: 'ISO Certificate', value: 'ISO/15189-2022-UAE', icon: CheckCircle2 },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="rounded-xl p-3" style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                      <Icon style={{ width: 16, height: 16, color: '#4F46E5', marginBottom: 6 }} />
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#4F46E5', fontWeight: 700 }}>{card.value}</div>
                      <div style={{ fontSize: 10, color: '#6366F1' }}>{card.label}</div>
                    </div>
                  );
                })}
              </div>

              <div className="font-semibold text-slate-800 mb-3" style={{ fontSize: 13 }}>Analyzer Equipment Register</div>
              <div className="space-y-2">
                {[
                  { name: 'Roche Cobas 6000 (e601/c501)', sn: 'SN-RC6001-2019', service: 'Jan 2026', qc: 'Passing' },
                  { name: 'Roche Cobas 8000 (e602)', sn: 'SN-RC8000-2021', service: 'Mar 2026', qc: 'Passing' },
                  { name: 'Sysmex XN-3000', sn: 'SN-SY3000-2020', service: 'Feb 2026', qc: 'Passing' },
                  { name: 'Siemens BCS XP (Coagulation)', sn: 'SN-BCS-2018', service: 'Apr 2026', qc: 'Maintenance' },
                  { name: 'Vitek 2 Compact (Microbiology)', sn: 'SN-VT2-2020', service: 'Jun 2026', qc: 'Passing' },
                ].map(eq => (
                  <div key={eq.name} className="flex items-center gap-4 px-4 py-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Cpu style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0 }} />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800" style={{ fontSize: 12 }}>{eq.name}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#94A3B8' }}>{eq.sn}</div>
                    </div>
                    <div className="text-right">
                      <div style={{ fontSize: 10, color: '#64748B' }}>Service: {eq.service}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: eq.qc === 'Passing' ? '#10B981' : '#F59E0B' }}>{eq.qc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RADIOLOGY ACCREDITATION */}
        {tab === 'rad-accreditation' && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="flex items-center gap-2 mb-4">
                <ScanLine style={{ width: 16, height: 16, color: '#1D4ED8' }} />
                <span className="font-black text-blue-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>Radiology Accreditation</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  { label: 'DHA Rad License', value: 'DHA-RAD-2016-001247', icon: Shield },
                  { label: 'JCI Accredited', value: 'JCI-RAD-2022-0341', icon: Award },
                  { label: 'Radiation Safety', value: 'RSO Certified ✓', icon: CheckCircle2 },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="rounded-xl p-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                      <Icon style={{ width: 16, height: 16, color: '#1D4ED8', marginBottom: 6 }} />
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#1D4ED8', fontWeight: 700 }}>{card.value}</div>
                      <div style={{ fontSize: 10, color: '#3B82F6' }}>{card.label}</div>
                    </div>
                  );
                })}
              </div>

              <div className="font-semibold text-slate-800 mb-3" style={{ fontSize: 13 }}>Radiology Equipment Register</div>
              <div className="space-y-2">
                {[
                  { name: 'MRI 3T — Siemens Vida', sn: 'SN-VIDA3T-2021', service: 'Dec 2025', inspect: 'Mar 2026' },
                  { name: 'MRI 1.5T — Siemens MAGNETOM Sola', sn: 'SN-SOLA15-2019', service: 'Feb 2026', inspect: 'Apr 2026' },
                  { name: 'CT 256-slice — Philips Brilliance', sn: 'SN-PH256-2020', service: 'Jan 2026', inspect: 'Mar 2026' },
                  { name: 'CT 64-slice', sn: 'SN-CT64-2018', service: 'Apr 2026', inspect: 'Jun 2026' },
                  { name: 'Digital X-Ray (3 rooms)', sn: 'SN-DXR-2019', service: 'Feb 2026', inspect: 'Ongoing QA' },
                  { name: 'Ultrasound Suites (6 rooms)', sn: 'SN-USS-2021', service: 'Mar 2026', inspect: 'Monthly' },
                  { name: 'PET-CT — Siemens Biograph mCT', sn: 'SN-BIOGRAPH-2022', service: 'Jun 2026', inspect: 'Quarterly' },
                ].map(eq => (
                  <div key={eq.name} className="flex items-center gap-4 px-4 py-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <ScanLine style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0 }} />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800" style={{ fontSize: 12 }}>{eq.name}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#94A3B8' }}>{eq.sn}</div>
                    </div>
                    <div className="text-right">
                      <div style={{ fontSize: 10, color: '#64748B' }}>Service: {eq.service}</div>
                      <div style={{ fontSize: 10, color: '#64748B' }}>QA: {eq.inspect}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl p-4" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div className="font-semibold text-blue-800 mb-2" style={{ fontSize: 13 }}>Radiologist Roster</div>
                {[
                  { name: 'Dr. Rania Al Suwaidi', qual: 'FRCR', specialty: 'General Radiology, Neuroradiology', status: 'On duty' },
                  { name: 'Dr. Khalid Al Hamdan', qual: 'FRCR, EBIR', specialty: 'Interventional Radiology', status: 'Off duty' },
                  { name: 'Dr. Mariam Al Zaabi', qual: 'FRCR', specialty: 'Breast Imaging, Ultrasound', status: 'On call' },
                ].map(r => (
                  <div key={r.name} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(29,78,216,0.1)' }}>
                    <User style={{ width: 14, height: 14, color: '#1D4ED8', flexShrink: 0 }} />
                    <div className="flex-1">
                      <span className="font-semibold text-slate-800" style={{ fontSize: 12 }}>{r.name}</span>
                      <span className="ml-1 px-1.5 py-0.5 rounded font-bold" style={{ fontSize: 8, background: '#EFF6FF', color: '#1D4ED8' }}>{r.qual}</span>
                      <div style={{ fontSize: 10, color: '#64748B' }}>{r.specialty}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: r.status === 'On duty' ? '#10B981' : r.status === 'On call' ? '#F59E0B' : '#94A3B8' }}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TEST & IMAGING MENU */}
        {tab === 'test-menu' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                {([['lab-tests', FlaskConical, 'Lab Tests'], ['imaging-studies', ScanLine, 'Imaging Studies']] as const).map(([id, Icon, label]) => (
                  <button key={id} onClick={() => setMenuTab(id as MenuTab)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all"
                    style={{ fontSize: 12, background: menuTab === id ? '#4F46E5' : '#fff', color: menuTab === id ? '#fff' : '#64748B', border: `1px solid ${menuTab === id ? '#4F46E5' : '#E2E8F0'}` }}>
                    <Icon style={{ width: 13, height: 13 }} />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold hover:opacity-90"
                  style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 12, border: '1px solid #C7D2FE' }}>
                  <Plus style={{ width: 13, height: 13 }} /> Add Study
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold hover:opacity-90"
                  style={{ background: '#F1F5F9', color: '#64748B', fontSize: 12, border: '1px solid #E2E8F0' }}>
                  Export Menu
                </button>
              </div>
            </div>

            {menuTab === 'lab-tests' && (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
                <div className="grid text-xs font-bold text-slate-400 px-5 py-2.5" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <div>Test Name</div><div>Department</div><div>TAT</div><div>CPT Code</div><div className="text-right">Price</div>
                </div>
                {LAB_TESTS.map(t => (
                  <div key={t.name} className="grid items-center px-5 py-3 hover:bg-slate-50 transition-colors"
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', borderBottom: '1px solid #F8FAFC' }}>
                    <div className="font-semibold text-slate-800" style={{ fontSize: 12 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#4F46E5' }}>{t.dept}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{t.tat}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#94A3B8' }}>{t.cpt}</div>
                    <div className="text-right font-bold" style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#10B981' }}>{t.price}</div>
                  </div>
                ))}
              </div>
            )}

            {menuTab === 'imaging-studies' && (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
                <div className="grid text-xs font-bold text-slate-400 px-5 py-2.5" style={{ gridTemplateColumns: '2fr 80px 2fr 1fr 1fr 1fr 1fr', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <div>Study Name</div><div>Modality</div><div>Preparation</div><div>TAT</div><div>CPT</div><div>Coverage</div><div className="text-right">Price</div>
                </div>
                {IMAGING_STUDIES.map(s => {
                  const ms = MOD_STYLE[s.modality] || { bg: '#F1F5F9', color: '#64748B' };
                  return (
                    <div key={s.name} className="grid items-start px-5 py-3 hover:bg-slate-50 transition-colors"
                      style={{ gridTemplateColumns: '2fr 80px 2fr 1fr 1fr 1fr 1fr', borderBottom: '1px solid #F8FAFC' }}>
                      <div className="font-semibold text-slate-800" style={{ fontSize: 12 }}>{s.name}</div>
                      <div><span className="px-1.5 py-0.5 rounded font-black" style={{ fontSize: 8, background: ms.bg, color: ms.color }}>{s.modality}</span></div>
                      <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.5 }}>{s.prep}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{s.tat}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#94A3B8' }}>{s.cpt}</div>
                      <div style={{ fontSize: 10, color: '#1D4ED8' }}>{s.coverage}</div>
                      <div className="text-right font-bold" style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#10B981' }}>{s.price}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="text-center py-16" style={{ color: '#94A3B8' }}>
            <Settings style={{ width: 40, height: 40, color: '#CBD5E1', margin: '0 auto 12px' }} />
            <div className="font-semibold text-slate-600" style={{ fontSize: 14 }}>Portal Settings</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Configuration options for Lab & Radiology Portal</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
