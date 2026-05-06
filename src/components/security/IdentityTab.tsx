import { useState } from 'react';
import { Search, Shield, UserX, RefreshCw, Clock, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { IAM_USERS, type IamUser } from '../../data/securityData';
import { S, SCard, SectionHeader, RiskChip, SeverityDot, STH, STD, STR, MonoValue } from './SecurityPrimitives';

const ROLES = [
  { name: 'Super Admin', users: 1, permissions: 'All', lastModified: '2026-01-15', privileged: true },
  { name: 'Admin', users: 4, permissions: '248', lastModified: '2026-03-08', privileged: true },
  { name: 'Security Officer', users: 2, permissions: '84', lastModified: '2026-02-20', privileged: true },
  { name: 'Compliance Officer', users: 1, permissions: '62', lastModified: '2026-02-14', privileged: false },
  { name: 'Doctor', users: 284, permissions: '38', lastModified: '2026-03-01', privileged: false },
  { name: 'Pharmacist', users: 41, permissions: '22', lastModified: '2026-02-28', privileged: false },
  { name: 'Support (Read-only)', users: 8, permissions: '14', lastModified: '2025-11-01', privileged: false },
];

const PRIVILEGED_USERS = IAM_USERS.filter(u => u.privileged);
const JIT_ELEVATIONS = [
  { id: 'JIT-001', actor: 'USR-ADMIN-0041', role: 'Super Admin', scope: 'Production DB', reason: 'Emergency PHI audit', grantedBy: 'USR-ADMIN-0001', expiresIn: 'REVOKED', active: false },
  { id: 'JIT-002', actor: 'USR-ADMIN-0089', role: 'Security Officer', scope: 'Audit logs (all)', reason: 'Active incident investigation', grantedBy: 'USR-ADMIN-0001', expiresIn: '1h 12m', active: true },
];

const MFA_STATUS_COLORS: Record<string, string> = {
  FIDO2: '#A78BFA',
  WebAuthn: S.tealLight,
  TOTP: '#38BDF8',
};

export function IdentityTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [mfaFilter, setMfaFilter] = useState<string>('All');
  const [selectedUser, setSelectedUser] = useState<IamUser | null>(null);

  const filtered = IAM_USERS.filter(u => {
    if (statusFilter !== 'All' && u.status !== statusFilter) return false;
    if (mfaFilter === 'Enrolled' && !u.mfaEnrolled) return false;
    if (mfaFilter === 'Not enrolled' && u.mfaEnrolled) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
    }
    return true;
  });

  const statusColor = (status: IamUser['status']) => {
    const m: Record<string, string> = { Active: S.successLight, Suspended: S.errorLight, Pending: S.warningLight, Locked: S.orangeLight, Disabled: S.text3 };
    return m[status] || S.text3;
  };

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* Roles */}
      <SCard className="p-5">
        <SectionHeader title="Platform Roles">
          <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
            <Shield size={9} /> New role
          </button>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: S.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                <STH>Role</STH>
                <STH>Users</STH>
                <STH>Permissions</STH>
                <STH>Privileged</STH>
                <STH>Last Modified</STH>
                <STH>Actions</STH>
              </tr>
            </thead>
            <tbody>
              {ROLES.map(r => (
                <STR key={r.name}>
                  <STD>
                    <div className="flex items-center gap-2">
                      {r.privileged && <Shield size={10} style={{ color: S.warningLight }} />}
                      <span className="text-xs font-semibold" style={{ color: S.text1 }}>{r.name}</span>
                    </div>
                  </STD>
                  <STD mono>{r.users}</STD>
                  <STD mono>{r.permissions}</STD>
                  <STD>
                    {r.privileged
                      ? <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: S.warningBg, color: S.warningLight }}>Privileged</span>
                      : <span className="text-[9px]" style={{ color: S.text3 }}>—</span>
                    }
                  </STD>
                  <STD mono>{r.lastModified}</STD>
                  <td className="py-2 pr-3">
                    <div className="flex gap-1">
                      <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.tealBg, color: S.tealLight }}>Edit</button>
                      <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.bg1, color: S.text3 }}>View matrix</button>
                    </div>
                  </td>
                </STR>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>

      {/* Users table */}
      <SCard className="p-5">
        <SectionHeader title={`Users with Access (${IAM_USERS.length})`}>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: S.bg1, border: `1px solid ${S.border}` }}>
              <Search size={10} style={{ color: S.text3 }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name, email, ID…"
                className="bg-transparent text-[10px] outline-none w-36" style={{ color: S.text1 }} />
            </div>
            <div className="flex gap-1">
              {['All', 'Active', 'Suspended', 'Locked'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="text-[10px] px-2 py-0.5 rounded-lg"
                  style={statusFilter === s ? { background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` } : { background: S.bg1, color: S.text3, border: `1px solid ${S.border}` }}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {['All', 'Enrolled', 'Not enrolled'].map(m => (
                <button key={m} onClick={() => setMfaFilter(m)}
                  className="text-[10px] px-2 py-0.5 rounded-lg"
                  style={mfaFilter === m ? { background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` } : { background: S.bg1, color: S.text3, border: `1px solid ${S.border}` }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </SectionHeader>
        <div className="flex gap-0">
          <div className="flex-1 overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: S.bg3 }}>
                <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                  <STH>User</STH>
                  <STH>Roles</STH>
                  <STH>MFA</STH>
                  <STH>Last Sign-in</STH>
                  <STH>Risk</STH>
                  <STH>Status</STH>
                  <STH>Actions</STH>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <STR key={u.id} onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)} selected={selectedUser?.id === u.id}
                    highlight={u.status === 'Suspended' || u.riskScore === 'critical'}>
                    <STD>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: S.text1 }}>{u.name}</div>
                        <MonoValue value={u.id} />
                      </div>
                    </STD>
                    <STD>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map(r => (
                          <span key={r} className="text-[9px] px-1.5 py-0.5 rounded"
                            style={{ background: u.privileged ? S.warningBg : S.bg1, color: u.privileged ? S.warningLight : S.text3, border: `1px solid ${S.border}` }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </STD>
                    <STD>
                      {u.mfaEnrolled
                        ? <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: 'rgba(167,139,250,0.1)', color: MFA_STATUS_COLORS[u.mfaMethod || ''] || S.tealLight }}>
                            {u.mfaMethod}
                          </span>
                        : <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: S.errorBg, color: S.errorLight }}>None</span>
                      }
                    </STD>
                    <STD mono>
                      {new Date(u.lastSignIn).toLocaleString('en-AE', { timeZone: 'Asia/Dubai', hour12: false, month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </STD>
                    <STD><RiskChip score={u.riskScore} /></STD>
                    <STD>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ color: statusColor(u.status), background: `${statusColor(u.status)}18` }}>
                        {u.status}
                      </span>
                    </STD>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        {!u.mfaEnrolled && <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.warningBg, color: S.warningLight }}>Force MFA</button>}
                        <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.tealBg, color: S.tealLight }}>View</button>
                      </div>
                    </td>
                  </STR>
                ))}
              </tbody>
            </table>
          </div>
          {selectedUser && (
            <div className="w-64 flex-shrink-0 border-l p-4" style={{ borderColor: S.border, background: S.bg1 }}>
              <div className="text-sm font-semibold mb-1" style={{ color: S.text1 }}>{selectedUser.name}</div>
              <div className="text-[10px] mb-3" style={{ color: S.text3 }}>{selectedUser.email}</div>
              <div className="space-y-1.5 text-[10px]">
                {[
                  { label: 'User ID', value: selectedUser.id },
                  { label: 'Status', value: selectedUser.status },
                  { label: 'MFA', value: selectedUser.mfaEnrolled ? selectedUser.mfaMethod || 'Enrolled' : 'Not enrolled' },
                  { label: 'Risk score', value: selectedUser.riskScore },
                  { label: 'Workspaces', value: selectedUser.workspaces.join(', ') },
                ].map(f => (
                  <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${S.border}` }}>
                    <span style={{ color: S.text3 }}>{f.label}</span>
                    <span style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1.5">
                {!selectedUser.mfaEnrolled && (
                  <button className="w-full text-[10px] py-1.5 rounded-lg" style={{ background: S.warningBg, color: S.warningLight, border: `1px solid ${S.warningBorder}` }}>
                    Force MFA enrolment
                  </button>
                )}
                <button className="w-full text-[10px] py-1.5 rounded-lg" style={{ background: S.bg2, color: S.text2, border: `1px solid ${S.border}` }}>
                  Revoke all sessions
                </button>
                {selectedUser.status === 'Active' && (
                  <button className="w-full text-[10px] py-1.5 rounded-lg" style={{ background: S.errorBg, color: S.errorLight, border: `1px solid ${S.errorBorder}` }}>
                    Suspend user
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </SCard>

      {/* Privileged access & JIT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SCard className="p-5">
          <SectionHeader title="Privileged Access">
            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: S.warningBg, color: S.warningLight }}>
              Q2 review in progress · 8 of 14
            </span>
          </SectionHeader>
          <div className="space-y-2">
            {PRIVILEGED_USERS.map(u => (
              <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl"
                style={{ background: S.bg1, border: `1px solid ${S.border}` }}>
                <div>
                  <div className="text-xs font-semibold" style={{ color: S.text1 }}>{u.name}</div>
                  <div className="text-[10px]" style={{ color: S.text3 }}>{u.roles[0]} · {u.mfaMethod || 'No MFA'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <RiskChip score={u.riskScore} />
                  {!u.mfaEnrolled && <AlertTriangle size={12} style={{ color: S.errorLight }} />}
                </div>
              </div>
            ))}
          </div>
        </SCard>

        <SCard className="p-5">
          <SectionHeader title="Just-in-Time Elevations">
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
              Request elevation
            </button>
          </SectionHeader>
          <div className="space-y-3">
            {JIT_ELEVATIONS.map(j => (
              <div key={j.id} className="p-3 rounded-xl"
                style={{ background: S.bg1, border: `1px solid ${j.active ? S.warningBorder : S.border}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: j.active ? S.warningBg : S.bg2, color: j.active ? S.warningLight : S.text3 }}>
                      {j.active ? 'Active' : 'Expired'}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: S.text1 }}>{j.role}</span>
                  </div>
                  {j.active && (
                    <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.errorBg, color: S.errorLight }}>Revoke</button>
                  )}
                </div>
                <div className="text-[10px]" style={{ color: S.text3 }}>
                  <span style={{ color: S.text2 }}>{j.actor}</span> · {j.scope}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: S.text3 }}>
                  Reason: {j.reason} · Expires: <span style={{ color: j.active ? S.warningLight : S.text3, fontFamily: 'DM Mono, monospace' }}>{j.expiresIn}</span>
                </div>
              </div>
            ))}
          </div>
        </SCard>
      </div>
    </div>
  );
}
