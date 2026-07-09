import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, exportRowsToCsv, titleCase, formatDate, type AdminContext } from './AdminShell';
import { createOrganization, updateOrganization } from '../../hooks';
import type { CreateOrganizationInput } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import type { Organization, OrganizationKind } from '../../types/database';

type OrgKind = OrganizationKind;
type OrgKindFilter = OrgKind | 'all';

const ORG_KIND_OPTIONS: { value: OrgKind; label: string; description: string }[] = [
  { value: 'hospital', label: 'Hospital', description: 'Full-service inpatient facility' },
  { value: 'clinic', label: 'Clinic', description: 'Outpatient or specialist clinic' },
  { value: 'pharmacy', label: 'Pharmacy', description: 'Retail or hospital pharmacy' },
  { value: 'lab', label: 'Laboratory', description: 'Diagnostic / imaging lab' },
  { value: 'insurance', label: 'Insurance', description: 'Health insurance provider' },
];

interface OnboardOrganizationModalProps {
  open: boolean;
  defaultKind?: OrgKind;
  onClose: () => void;
  onCreated: (org: Organization) => void;
}
const OnboardOrganizationModal = ({
  open,
  defaultKind = 'hospital',
  onClose,
  onCreated,
}: OnboardOrganizationModalProps) => {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<OrgKind>(defaultKind);
  const [city, setCity] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [seatsAllocated, setSeatsAllocated] = useState('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setKind(defaultKind);
      setName('');
      setCity('');
      setContactName('');
      setContactEmail('');
      setSeatsAllocated('0');
      setNotes('');
      setError(null);
      setSubmitting(false);
    }
  }, [open, defaultKind]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Organization name is required.');
      return;
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setError('Primary contact email looks invalid.');
      return;
    }
    const seats = Number.parseInt(seatsAllocated, 10);
    const payload: CreateOrganizationInput = {
      name: trimmedName,
      kind,
      city: city.trim() || null,
      primaryContactName: contactName.trim() || null,
      primaryContactEmail: contactEmail.trim() || null,
      notes: notes.trim() || null,
      seatsAllocated: Number.isFinite(seats) && seats > 0 ? seats : 0,
      status: 'pending',
    };
    setSubmitting(true);
    try {
      const created = await createOrganization(payload);
      onCreated(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create organization.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:items-center">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">
              Onboard organization
            </h2>
            <p className="text-xs text-slate-500">
              Creates a pending tenant. Status flips to active after BAA + go-live.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Organization type
            </label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {ORG_KIND_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setKind(option.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    kind === option.value
                      ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-bold text-slate-900">{option.label}</div>
                  <div className="text-[11px] text-slate-500">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="org-name" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Organization name <span className="text-rose-600">*</span>
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              maxLength={FORM_FIELD_LIMITS.shortText}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
              placeholder="e.g. Mediclinic City Hospital"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="org-city" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                City
              </label>
              <input
                id="org-city"
                type="text"
                value={city}
                maxLength={FORM_FIELD_LIMITS.shortText}
                onChange={(event) => setCity(event.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                placeholder="Dubai"
              />
            </div>
            <div>
              <label htmlFor="org-seats" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Seats allocated
              </label>
              <input
                id="org-seats"
                type="number"
                min={0}
                value={seatsAllocated}
                onChange={(event) => setSeatsAllocated(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="org-contact-name" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Primary contact name
              </label>
              <input
                id="org-contact-name"
                type="text"
                value={contactName}
                maxLength={FORM_FIELD_LIMITS.personName}
                onChange={(event) => setContactName(event.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                placeholder="Operations lead"
              />
            </div>
            <div>
              <label htmlFor="org-contact-email" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Primary contact email
              </label>
              <input
                id="org-contact-email"
                type="email"
                value={contactEmail}
                maxLength={FORM_FIELD_LIMITS.email}
                onChange={(event) => setContactEmail(event.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                placeholder="ops@example.ae"
              />
            </div>
          </div>

          <div>
            <label htmlFor="org-notes" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Notes
            </label>
            <textarea
              id="org-notes"
              value={notes}
              maxLength={FORM_FIELD_LIMITS.clinicalNotes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
              placeholder="BAA status, integration scope, NABIDH endpoint, etc."
            />
          </div>

          {error ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OrganizationsView = ({ context }: { context: AdminContext }) => {
  const orgs = context.organizations;
  const orgsSummary = context.dashboard?.orgsSummary;
  const [filterKind, setFilterKind] = useState<OrgKindFilter>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardKind, setOnboardKind] = useState<OrgKind>('hospital');
  const [createdToast, setCreatedToast] = useState<string | null>(null);
  const createdToastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (createdToastTimeoutRef.current !== null) {
        window.clearTimeout(createdToastTimeoutRef.current);
      }
    };
  }, []);

  const openOnboard = (preset: OrgKind) => {
    setOnboardKind(preset);
    setOnboardOpen(true);
  };

  const filtered = useMemo(() => {
    let rows = orgs;
    if (filterKind !== 'all') rows = rows.filter((o) => o.kind === filterKind);
    if (statusFilter !== 'all') rows = rows.filter((o) => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.city ?? '').toLowerCase().includes(q) ||
          (o.slug ?? '').toLowerCase().includes(q) ||
          (o.notes ?? '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [orgs, filterKind, statusFilter, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organization Management"
        subtitle="Manage all healthcare organizations on the CeenAiX platform"
      >
        <button
          type="button"
          onClick={() =>
            exportRowsToCsv(
              filtered.map((o) => ({
                name: o.name,
                kind: o.kind,
                status: o.status,
                slug: o.slug ?? '',
                city: o.city ?? '',
                notes: o.notes ?? '',
              } satisfies Record<string, unknown>)),
              `organizations-${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
          disabled={!filtered.length}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => openOnboard('pharmacy')}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Onboard Pharmacy
        </button>
        <button
          type="button"
          onClick={() => openOnboard('lab')}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Onboard Lab
        </button>
        <button
          type="button"
          onClick={() => openOnboard('hospital')}
          className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          + Add Organization
        </button>
      </PageHeader>

      {createdToast ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {createdToast}
        </div>
      ) : null}

      <OnboardOrganizationModal
        open={onboardOpen}
        defaultKind={onboardKind}
        onClose={() => setOnboardOpen(false)}
        onCreated={(org) => {
          setOnboardOpen(false);
          context.refreshOrganizations();
          context.refetchDashboard();
          setCreatedToast(`Created ${org.name} (${titleCase(org.kind)}) — status set to pending.`);
          if (createdToastTimeoutRef.current !== null) {
            window.clearTimeout(createdToastTimeoutRef.current);
          }
          createdToastTimeoutRef.current = window.setTimeout(() => {
            setCreatedToast(null);
            createdToastTimeoutRef.current = null;
          }, 5000);
        }}
      />

      <div className="grid gap-5 lg:grid-cols-[260px,1fr]">
        <Card>
          <h3 className="mb-3 font-['Plus_Jakarta_Sans'] text-base font-bold">Filters</h3>
          <div className="mb-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <Search className="mr-2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              maxLength={FORM_FIELD_LIMITS.searchQuery}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Type</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  { key: 'hospital', label: 'Hospital' },
                  { key: 'clinic', label: 'Clinic' },
                  { key: 'pharmacy', label: 'Pharmacy' },
                  { key: 'lab', label: 'Laboratory' },
                  { key: 'insurance', label: 'Insurance' },
                ] as const
              ).map((kind) => (
                <button
                  key={kind.key}
                  type="button"
                  onClick={() => setFilterKind((current) => (current === kind.key ? 'all' : kind.key))}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    filterKind === kind.key
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {kind.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {['active', 'pending', 'suspended', 'archived'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter((current) => (current === status ? 'all' : status))}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    statusFilter === status
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {titleCase(status)}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilterKind('all');
              setStatusFilter('all');
              setSearch('');
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear All Filters
          </button>
        </Card>

        <div className="space-y-4">
          <Card className="!p-4">
            <div className="grid gap-2 text-sm sm:grid-cols-3 xl:grid-cols-5">
              <span>
                <span className="font-bold text-slate-900">Hospitals:</span> {orgsSummary?.hospitals ?? 0}
              </span>
              <span>
                <span className="font-bold text-slate-900">Clinics:</span> {orgsSummary?.clinics ?? 0}
              </span>
              <span>
                <span className="font-bold text-slate-900">Pharmacies:</span> {orgsSummary?.pharmacies ?? 0}
              </span>
              <span>
                <span className="font-bold text-slate-900">Labs:</span> {orgsSummary?.labs ?? 0}
              </span>
              <span>
                <span className="font-bold text-slate-900">Total:</span> {orgsSummary?.total ?? orgs.length}
              </span>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((org) => (
              <OrganizationCard
                key={org.id}
                org={org}
                doctors={context.doctors}
                onUpdated={() => {
                  context.refreshOrganizations();
                  context.refetchDashboard();
                }}
              />
            ))}
            {filtered.length === 0 ? (
              <Card className="md:col-span-2 xl:col-span-3">
                <div className="py-12 text-center text-slate-500">No organizations match your filters.</div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const OrganizationCard = ({
  org,
  doctors,
  onUpdated,
}: {
  org: Organization;
  doctors: AdminContext['doctors'];
  onUpdated: () => void;
}) => {
  const navigate = useNavigate();
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: org.name,
    city: org.city ?? '',
    country: org.country,
    primary_contact_name: org.primary_contact_name ?? '',
    primary_contact_email: org.primary_contact_email ?? '',
    status: org.status,
    seats_allocated: org.seats_allocated,
    baa_signed_at: org.baa_signed_at ? org.baa_signed_at.slice(0, 10) : '',
    contract_started_at: org.contract_started_at ? org.contract_started_at.slice(0, 10) : '',
    contract_ends_at: org.contract_ends_at ? org.contract_ends_at.slice(0, 10) : '',
    dha_license: org.dha_license ?? '',
    nabidh_connected: org.nabidh_connected,
    notes: org.notes ?? '',
  });

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateOrganization({
        id: org.id,
        name: form.name,
        city: form.city || null,
        country: form.country,
        primaryContactName: form.primary_contact_name || null,
        primaryContactEmail: form.primary_contact_email || null,
        status: form.status,
        seatsAllocated: form.seats_allocated,
        baaSignedAt: form.baa_signed_at ? new Date(form.baa_signed_at).toISOString() : null,
        contractStartedAt: form.contract_started_at ? new Date(form.contract_started_at).toISOString() : null,
        contractEndsAt: form.contract_ends_at ? new Date(form.contract_ends_at).toISOString() : null,
        dhaLicense: form.dha_license || null,
        nabidhConnected: form.nabidh_connected,
        notes: form.notes || null,
      });
      setShowEdit(false);
      onUpdated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };
  const dha = org.dha_license ?? '—';
  const affiliatedDoctors =
    org.kind === 'hospital' || org.kind === 'clinic'
      ? doctors.filter((d) => (d.clinic_name ?? '').trim().toLowerCase() === org.name.trim().toLowerCase())
      : [];
  const kindTone =
    org.kind === 'hospital'
      ? 'violet'
      : org.kind === 'pharmacy'
        ? 'emerald'
        : org.kind === 'lab'
          ? 'amber'
          : org.kind === 'insurance'
            ? 'rose'
            : 'blue';
  return (
    <Card>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">{org.name}</h3>
          <div className="font-['DM_Mono'] text-[11px] text-slate-500">{dha}</div>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Pill tone={kindTone}>{titleCase(org.kind)}</Pill>
        <Pill tone="slate">{org.city ?? 'UAE'}</Pill>
        <Pill
          tone={
            org.status === 'active'
              ? 'emerald'
              : org.status === 'pending'
                ? 'amber'
                : org.status === 'suspended'
                  ? 'rose'
                  : 'slate'
          }
        >
          {titleCase(org.status)}
        </Pill>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-slate-50 p-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Active Users</dt>
          <dd className="font-['DM_Mono'] text-base font-bold text-slate-900">{org.seats_used ?? 0}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Seats</dt>
          <dd className="font-['DM_Mono'] text-base font-bold text-slate-900">
            {org.seats_used ?? 0} / {org.seats_allocated}
          </dd>
        </div>
        <div className="col-span-2 rounded-xl bg-slate-50 p-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">NABIDH Status</dt>
          <dd className={`font-bold ${org.nabidh_connected ? 'text-emerald-700' : 'text-slate-500'}`}>
            {org.nabidh_connected ? '✅ connected' : '⚪ not connected'}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50"
        >
          View
        </button>
        <button
          type="button"
          onClick={() => setShowEdit(true)}
          className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => navigate('/admin/revenue')}
          className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50"
        >
          Billing
        </button>
        <button
          type="button"
          onClick={() => navigate('/admin/audit')}
          className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50"
        >
          Audit
        </button>
      </div>

      {showDetail ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">{org.name}</h2>
                <p className="font-['DM_Mono'] text-xs text-slate-500">{org.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-1.5">
              <Pill tone={kindTone}>{titleCase(org.kind)}</Pill>
              <Pill tone={org.status === 'active' ? 'emerald' : org.status === 'pending' ? 'amber' : org.status === 'suspended' ? 'rose' : 'slate'}>
                {titleCase(org.status)}
              </Pill>
              <Pill tone={org.nabidh_connected ? 'emerald' : 'slate'}>
                {org.nabidh_connected ? '✅ NABIDH connected' : '⚪ NABIDH not connected'}
              </Pill>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">City / Country</div>
                <div className="mt-1 text-slate-900">{[org.city, org.country].filter(Boolean).join(', ') || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">DHA License</div>
                <div className="mt-1 font-['DM_Mono'] text-xs text-slate-700">{org.dha_license ?? '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Primary Contact</div>
                <div className="mt-1 text-slate-900">{org.primary_contact_name ?? '—'}</div>
                <div className="text-xs text-slate-500">{org.primary_contact_email ?? ''}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Seats</div>
                <div className="mt-1 text-slate-900">{org.seats_used} / {org.seats_allocated} used</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">BAA Signed</div>
                <div className="mt-1 text-slate-900">{org.baa_signed_at ? formatDate(org.baa_signed_at) : 'Not signed'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Contract</div>
                <div className="mt-1 text-slate-900">
                  {org.contract_started_at ? formatDate(org.contract_started_at) : '—'}
                  {org.contract_ends_at ? ` → ${formatDate(org.contract_ends_at)}` : ''}
                </div>
              </div>
            </div>

            {org.notes ? (
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Notes</div>
                <p className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{org.notes}</p>
              </div>
            ) : null}

            {org.kind === 'hospital' || org.kind === 'clinic' ? (
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Doctors Here ({affiliatedDoctors.length})
                </div>
                {affiliatedDoctors.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">No doctors matched to this organization by name.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {affiliatedDoctors.map((d) => (
                      <li key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                        <span className="font-semibold text-slate-900">{d.full_name}</span>
                        <span className="text-xs text-slate-500">{d.specialty ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-100">
                Staff affiliation isn't tracked for this organization type yet.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showEdit ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => !saving && setShowEdit(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Edit {org.name}</h2>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                disabled={saving}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {saveError ? (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {saveError}
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-600">
                  Name
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Status
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  City
                  <input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Country
                  <input
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Primary Contact Name
                  <input
                    value={form.primary_contact_name}
                    onChange={(e) => setForm((f) => ({ ...f, primary_contact_name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Primary Contact Email
                  <input
                    type="email"
                    value={form.primary_contact_email}
                    onChange={(e) => setForm((f) => ({ ...f, primary_contact_email: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Seats Allocated
                  <input
                    type="number"
                    min={0}
                    value={form.seats_allocated}
                    onChange={(e) => setForm((f) => ({ ...f, seats_allocated: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  DHA License
                  <input
                    value={form.dha_license}
                    onChange={(e) => setForm((f) => ({ ...f, dha_license: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  BAA Signed
                  <input
                    type="date"
                    value={form.baa_signed_at}
                    onChange={(e) => setForm((f) => ({ ...f, baa_signed_at: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Contract Start
                  <input
                    type="date"
                    value={form.contract_started_at}
                    onChange={(e) => setForm((f) => ({ ...f, contract_started_at: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Contract End
                  <input
                    type="date"
                    value={form.contract_ends_at}
                    onChange={(e) => setForm((f) => ({ ...f, contract_ends_at: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.nabidh_connected}
                    onChange={(e) => setForm((f) => ({ ...f, nabidh_connected: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  NABIDH Connected
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-600">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const AdminOrganizations = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Organizations · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="organizations" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : (
        <OrganizationsView context={context} />
      )}
    </AdminShell>
  );
};
