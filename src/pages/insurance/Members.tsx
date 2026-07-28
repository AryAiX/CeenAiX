import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { supabase } from '../../lib/supabase';
import InsuranceShell, {
  KpiHostedCard,
  StatusPill,
  formatDate,
  formatNumber,
  statusTone,
  useInsurancePageData,
} from './InsuranceShell';

type MembersTab = 'members' | 'requests';

interface PendingMembershipRequest {
  id: string;
  patientId: string;
  patientName: string;
  policyNumber: string | null;
  memberId: string | null;
  validUntil: string | null;
  cardPhotoUrl: string | null;
  createdAt: string;
  planName: string | null;
  providerCompany: string | null;
}

export const InsuranceMembers = () => {
  const { data, loading, error, refetch } = useInsurancePageData();
  const members = useMemo(() => data?.members ?? [], [data?.members]);
  const profile = data?.profile;
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const [tab, setTab] = useState<MembersTab>('members');
  const [pendingRequests, setPendingRequests] = useState<PendingMembershipRequest[]>([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [denyingRequestId, setDenyingRequestId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');

  const fetchPendingRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    const { data: rows, error: fetchError } = await supabase
      .from('insurance_membership_requests')
      .select(
        'id, patient_id, policy_number, member_id, valid_until, card_photo_url, status, created_at, insurance_plans(name, provider_company)'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (fetchError) {
      setRequestsError(fetchError.message);
      setRequestsLoading(false);
      return;
    }

    const requestRows = (rows ?? []) as Array<{
      id: string;
      patient_id: string;
      policy_number: string | null;
      member_id: string | null;
      valid_until: string | null;
      card_photo_url: string | null;
      created_at: string;
      insurance_plans:
        | { name: string | null; provider_company: string | null }
        | { name: string | null; provider_company: string | null }[]
        | null;
    }>;

    const patientIds = Array.from(new Set(requestRows.map((row) => row.patient_id)));
    let namesById = new Map<string, string>();
    if (patientIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', patientIds);
      namesById = new Map(
        (profiles ?? []).map((row) => [row.user_id, row.full_name ?? 'Unknown patient'])
      );
    }

    setPendingRequests(
      requestRows.map((row) => {
        const plan = Array.isArray(row.insurance_plans) ? row.insurance_plans[0] ?? null : row.insurance_plans;
        return {
          id: row.id,
          patientId: row.patient_id,
          patientName: namesById.get(row.patient_id) ?? 'Unknown patient',
          policyNumber: row.policy_number,
          memberId: row.member_id,
          validUntil: row.valid_until,
          cardPhotoUrl: row.card_photo_url,
          createdAt: row.created_at,
          planName: plan?.name ?? null,
          providerCompany: plan?.provider_company ?? null,
        };
      })
    );
    setRequestsLoaded(true);
    setRequestsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'requests' && !requestsLoaded) {
      void fetchPendingRequests();
    }
  }, [tab, requestsLoaded, fetchPendingRequests]);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = setTimeout(() => setActionMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  const openDenyForm = (requestId: string) => {
    setActionError(null);
    setDenyingRequestId(requestId);
    setDenyReason('');
  };

  const cancelDenyForm = () => {
    setDenyingRequestId(null);
    setDenyReason('');
  };

  const handleApprove = async (request: PendingMembershipRequest) => {
    setActionError(null);
    setBusyRequestId(request.id);
    const { error: approveError } = await supabase.rpc('approve_insurance_membership_request', {
      request_id: request.id,
    });
    if (approveError) {
      setActionError(approveError.message);
      setBusyRequestId(null);
      return;
    }
    setPendingRequests((prev) => prev.filter((row) => row.id !== request.id));
    setActionMessage(`Approved insurance request for ${request.patientName}.`);
    setBusyRequestId(null);
  };

  const handleDeny = async (request: PendingMembershipRequest) => {
    if (!denyReason.trim()) return;
    setActionError(null);
    setBusyRequestId(request.id);
    const { error: denyError } = await supabase.rpc('deny_insurance_membership_request', {
      request_id: request.id,
      reason: denyReason.trim(),
    });
    if (denyError) {
      setActionError(denyError.message);
      setBusyRequestId(null);
      return;
    }
    setPendingRequests((prev) => prev.filter((row) => row.id !== request.id));
    setActionMessage(`Denied insurance request for ${request.patientName}.`);
    setDenyingRequestId(null);
    setDenyReason('');
    setBusyRequestId(null);
  };

  const filtered = useMemo(() => {
    let rows = members;
    if (riskFilter !== 'all') rows = rows.filter((m) => m.riskLevel === riskFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (m) => m.patientName.toLowerCase().includes(q) || m.externalMemberId.toLowerCase().includes(q) || m.planName.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [members, riskFilter, search]);

  const tiers: Array<{ label: string; count: number | null; tone: string }> = [
    { label: 'Gold Tier', count: profile?.membersGold ?? null, tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
    { label: 'Silver Tier', count: profile?.membersSilver ?? null, tone: 'bg-slate-50 text-slate-700 ring-slate-200' },
    { label: 'Basic Tier', count: profile?.membersBasic ?? null, tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  ];

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 sm:px-6">
          <div className="flex min-w-max gap-6 overflow-x-auto sm:gap-8">
            {(
              [
                { key: 'members' as const, label: 'Members' },
                { key: 'requests' as const, label: 'Requests', badge: pendingRequests.length },
              ]
            ).map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`relative px-2 py-4 text-[15px] font-medium transition-all duration-300 ${
                    active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {item.label}
                  {item.badge ? (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                      {item.badge}
                    </span>
                  ) : null}
                  {active ? <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {tab === 'members' ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiHostedCard label="Active Members" value={loading ? '...' : formatNumber(profile?.activeMembers ?? members.length)} caption="On CeenAiX platform" tone="blue" />
            {tiers.map((tier) => (
              <article key={tier.label} className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100`}>
                <div className={`mb-2 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${tier.tone}`}>{tier.label}</div>
                <div className="font-mono text-2xl font-bold text-slate-900">{tier.count != null ? formatNumber(tier.count) : '—'}</div>
                <div className="mt-2 text-[11px] text-slate-500">members</div>
              </article>
            ))}
          </section>
          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">Members</h2>
                <p className="mt-0.5 text-xs text-slate-400">Active plan members and utilization risk</p>
              </div>
            </div>
            <div className="border-b border-slate-100 px-5 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    maxLength={FORM_FIELD_LIMITS.searchQuery}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                    placeholder="Search by name, member ID, or plan..."
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'high', 'medium', 'low'] as const).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setRiskFilter(tone)}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize ${riskFilter === tone ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {tone === 'all' ? 'All' : `${tone} risk`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 p-5 xl:grid-cols-2">
              {filtered.map((member) => (
                <div key={member.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{member.patientName}</div>
                      <div className="text-xs text-slate-500">
                        <span className="font-mono">{member.externalMemberId}</span> · {member.planName}
                      </div>
                    </div>
                    <StatusPill tone={statusTone(member.riskLevel)}>{member.riskLevel} risk</StatusPill>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white">
                    <div className={`h-2 rounded-full ${member.utilizationPercent >= 75 ? 'bg-red-500' : member.utilizationPercent >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, member.utilizationPercent)}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span className="font-mono">{member.utilizationPercent}% utilization</span>
                    <span>{member.claimCount} claims YTD</span>
                  </div>
                </div>
              ))}
              {filtered.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No members match.</div>
              ) : null}
            </div>
          </article>
        </>
      ) : (
        <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Membership Requests</h2>
              <p className="mt-0.5 text-xs text-slate-400">Patients requesting to link this organization&apos;s plans</p>
            </div>
          </div>

          {actionMessage ? (
            <div role="status" className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {actionMessage}
            </div>
          ) : null}
          {actionError ? (
            <div role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {actionError}
            </div>
          ) : null}
          {requestsError ? (
            <div role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {requestsError}
              <button
                type="button"
                onClick={() => void fetchPendingRequests()}
                className="ml-2 font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 p-5 xl:grid-cols-2">
            {requestsLoading ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Loading requests…
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No pending requests
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{request.patientName}</div>
                      <div className="text-xs text-slate-500">
                        {request.planName ?? '—'} · {request.providerCompany ?? '—'}
                      </div>
                    </div>
                    <StatusPill tone={statusTone('pending')}>pending</StatusPill>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
                    <div>
                      <div className="text-slate-400">Policy Number</div>
                      <div className="font-mono font-semibold text-slate-800">{request.policyNumber ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Member ID</div>
                      <div className="font-mono font-semibold text-slate-800">{request.memberId ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Valid Until</div>
                      <div className="font-semibold text-slate-800">{formatDate(request.validUntil)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Submitted</div>
                      <div className="font-semibold text-slate-800">{formatDate(request.createdAt)}</div>
                    </div>
                  </div>

                  {request.cardPhotoUrl ? (
                    <a
                      href={request.cardPhotoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline"
                    >
                      View card photo
                    </a>
                  ) : null}

                  {denyingRequestId === request.id ? (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                      <label className="mb-1.5 block text-xs font-semibold text-rose-700">Reason for denial</label>
                      <textarea
                        value={denyReason}
                        maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                        onChange={(e) => setDenyReason(e.target.value)}
                        rows={2}
                        autoFocus
                        className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
                        placeholder="Explain why this request is being denied..."
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDeny(request)}
                          disabled={!denyReason.trim() || busyRequestId === request.id}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyRequestId === request.id ? 'Denying…' : 'Confirm Deny'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelDenyForm}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleApprove(request)}
                        disabled={busyRequestId === request.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyRequestId === request.id ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openDenyForm(request.id)}
                        disabled={busyRequestId === request.id}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Deny
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </article>
      )}
    </InsuranceShell>
  );
};

export default InsuranceMembers;
