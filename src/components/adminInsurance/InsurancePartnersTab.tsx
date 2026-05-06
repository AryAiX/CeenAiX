import { useState } from 'react';
import { Search, MoreVertical, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { adminInsurers, AdminInsurer, PLATFORM_TOTALS } from '../../data/adminInsuranceData';

interface InsurancePartnersTabProps {
  onInsurerClick: (insurer: AdminInsurer) => void;
  showToast: (msg: string) => void;
}

type FilterType = 'all' | 'premium' | 'standard' | 'api-issues' | 'fraud';

const API_STATUS_CFG = {
  healthy: { label: 'API Healthy', color: '#34D399', bg: 'rgba(5,150,105,0.15)', icon: '✅' },
  degraded: { label: 'API Degraded', color: '#FCD34D', bg: 'rgba(180,83,9,0.15)', icon: '⚠️' },
  down: { label: 'API Down', color: '#FCA5A5', bg: 'rgba(153,27,27,0.15)', icon: '🔴' },
};

export default function InsurancePartnersTab({ onInsurerClick, showToast }: InsurancePartnersTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  const filtered = adminInsurers.filter(ins => {
    const matchSearch = !search || ins.name.toLowerCase().includes(search.toLowerCase()) || ins.license.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'premium' && ins.tier === 'premium') ||
      (filter === 'standard' && ins.tier === 'standard') ||
      (filter === 'api-issues' && ins.apiStatus !== 'healthy') ||
      (filter === 'fraud' && ins.fraudAlertsOpen > 0);
    return matchSearch && matchFilter;
  });

  const FILTERS: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'premium', label: 'Premium Partners' },
    { id: 'standard', label: 'Standard Partners' },
    { id: 'api-issues', label: 'API Issues' },
    { id: 'fraud', label: 'Has Fraud Alerts' },
  ];

  const getCardBorderColor = (ins: AdminInsurer) => {
    if (ins.fraudHighCount > 0) return '#EA580C';
    if (ins.apiStatus !== 'healthy' || ins.slaStatus === 'breach') return '#F59E0B';
    return '#10B981';
  };

  const getAutoApprovalColor = (rate: number) => {
    if (rate >= 80) return '#34D399';
    if (rate >= 70) return '#FCD34D';
    return '#FB923C';
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search style={{ width: 14, height: 14, color: '#475569', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search insurer name or license..."
            className="w-full rounded-xl pl-9 pr-4 py-2.5"
            style={{ background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }}
          />
        </div>
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-3 py-2 rounded-lg transition-colors"
              style={{
                fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600,
                background: filter === f.id ? 'rgba(13,148,136,0.15)' : '#1E293B',
                color: filter === f.id ? '#2DD4BF' : '#64748B',
                border: `1px solid ${filter === f.id ? 'rgba(13,148,136,0.4)' : '#334155'}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {filtered.map(ins => {
          const apicfg = API_STATUS_CFG[ins.apiStatus];
          const borderColor = getCardBorderColor(ins);
          const autoColor = getAutoApprovalColor(ins.autoApprovalRate);

          return (
            <div
              key={ins.id}
              className="rounded-2xl p-5 cursor-pointer transition-all relative"
              style={{
                background: 'rgba(30,41,59,0.6)',
                border: '1px solid rgba(71,85,105,0.5)',
                borderLeft: `4px solid ${borderColor}`,
              }}
              onClick={() => onInsurerClick(ins)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(30,41,59,0.9)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(13,148,136,0.2)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(30,41,59,0.6)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(71,85,105,0.5)';
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: ins.avatarGradient, fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace' }}
                  >
                    {ins.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.2 }}>
                      {ins.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                      {ins.license}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {ins.tier === 'premium' ? (
                        <span className="px-1.5 py-0.5 rounded-md" style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, background: 'rgba(120,53,15,0.5)', color: '#FCD34D' }}>
                          ⭐ Premium Partner
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md" style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: '#334155', color: '#94A3B8' }}>
                          Standard Partner
                        </span>
                      )}
                      {ins.isGovernment && (
                        <span className="px-1.5 py-0.5 rounded-md" style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', background: 'rgba(37,99,235,0.2)', color: '#93C5FD' }}>
                          🏛️ Abu Dhabi Government
                        </span>
                      )}
                      {ins.isNew && (
                        <span className="px-1.5 py-0.5 rounded-md" style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', background: 'rgba(37,99,235,0.2)', color: '#93C5FD' }}>
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                    style={{ background: apicfg.bg, border: `1px solid ${apicfg.color}33` }}
                  >
                    <span style={{ fontSize: 10 }}>{apicfg.icon}</span>
                    <span style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: apicfg.color, animation: ins.apiStatus !== 'healthy' ? 'pulse 2s infinite' : undefined }}>
                      {ins.apiStatus === 'healthy' ? `${ins.apiResponseMs}ms` : apicfg.label}
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setContextMenuId(contextMenuId === ins.id ? null : ins.id); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(51,65,85,0.5)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.5)'}
                  >
                    <MoreVertical style={{ width: 13, height: 13, color: '#64748B' }} />
                  </button>
                  {contextMenuId === ins.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setContextMenuId(null); }} />
                      <div className="absolute right-5 top-12 z-50 rounded-xl shadow-2xl overflow-hidden" style={{ width: 180, background: '#1E293B', border: '1px solid #334155' }}>
                        {['View Details', 'Edit Partnership', 'Test API', 'Send Message', 'Export Data', 'Suspend Partnership'].map(action => (
                          <button
                            key={action}
                            onClick={e => { e.stopPropagation(); setContextMenuId(null); showToast(`✅ ${action}`); }}
                            className="w-full text-left px-4 py-2.5 transition-colors"
                            style={{ fontSize: 12, color: action === 'Suspend Partnership' ? '#FCA5A5' : '#CBD5E1', fontFamily: 'Inter, sans-serif' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.5)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Members', value: ins.membersTotal.toLocaleString(), color: '#93C5FD' },
                  { label: 'Claims Today', value: ins.claimsToday.toString(), color: '#6EE7B7' },
                  { label: 'Value Today', value: `AED ${(ins.claimsValueToday / 1000).toFixed(0)}K`, color: '#6EE7B7' },
                  { label: 'Auto %', value: `${ins.autoApprovalRate}%`, color: autoColor },
                ].map(stat => (
                  <div key={stat.label}>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'Inter, sans-serif' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {ins.plans.map(plan => (
                  <span key={plan.name} className="px-2 py-0.5 rounded-md" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', background: 'rgba(37,99,235,0.1)', color: '#93C5FD', border: '1px solid rgba(37,99,235,0.2)' }}>
                    {plan.name}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span style={{ fontSize: 10, color: '#475569', fontFamily: 'Inter, sans-serif' }}>Since {ins.partnerSince} · </span>
                  <span style={{ fontSize: 11, color: '#6EE7B7', fontFamily: 'DM Mono, monospace' }}>AED {ins.platformRevenueMonth.toLocaleString()}/mo</span>
                </div>
                <div className="flex items-center gap-3">
                  {ins.slaStatus === 'compliant' ? (
                    <span style={{ fontSize: 10, color: '#34D399', fontFamily: 'Inter, sans-serif' }}>✅ SLA Compliant</span>
                  ) : (
                    <span style={{ fontSize: 10, color: '#FCD34D', fontFamily: 'Inter, sans-serif' }}>⚠️ {ins.slaBreachesToday} breach</span>
                  )}
                  {ins.fraudAlertsOpen > 0 ? (
                    <span style={{ fontSize: 10, color: '#FB923C', fontFamily: 'Inter, sans-serif' }}>{ins.fraudAlertsOpen} alerts 🔍</span>
                  ) : (
                    <span style={{ fontSize: 10, color: '#34D399', fontFamily: 'Inter, sans-serif' }}>0 fraud ✅</span>
                  )}
                </div>
              </div>

              {(ins.apiStatus !== 'healthy' || ins.slaBreachesToday > 0 || ins.fraudHighCount > 0) && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(51,65,85,0.4)' }}>
                  {ins.apiStatus !== 'healthy' && (
                    <span className="px-2 py-1 rounded-lg" style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', background: 'rgba(120,53,15,0.4)', color: '#FCD34D' }}>
                      ⚠️ API {ins.apiResponseMs}ms slow
                    </span>
                  )}
                  {ins.slaBreachesToday > 0 && ins.slaBreachRef && (
                    <span className="px-2 py-1 rounded-lg" style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', background: 'rgba(153,27,27,0.4)', color: '#FCA5A5' }}>
                      ⚡ SLA breach — {ins.slaBreachRef}
                    </span>
                  )}
                  {ins.fraudHighCount > 0 && (
                    <span className="px-2 py-1 rounded-lg" style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', background: 'rgba(154,52,18,0.4)', color: '#FDBA74' }}>
                      🔍 {ins.fraudHighCount} HIGH fraud alerts
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center mt-6 py-4" style={{ borderTop: '1px solid #334155' }}>
        <div style={{ fontSize: 12, color: '#475569', fontFamily: 'DM Mono, monospace' }}>
          {adminInsurers.length} insurance partners · {PLATFORM_TOTALS.totalMembers.toLocaleString()} insured members
        </div>
        <div style={{ fontSize: 12, color: '#475569', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
          Total monthly claims: AED {(PLATFORM_TOTALS.claimsValueMonthly / 1000000).toFixed(1)}M · Total platform revenue: AED {PLATFORM_TOTALS.platformRevenueMonth.toLocaleString()}/month
        </div>
      </div>
    </div>
  );
}
