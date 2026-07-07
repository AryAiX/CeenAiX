import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, exportRowsToCsv, titleCase, type AdminContext } from './AdminShell';
import { createOrganization } from '../../hooks';
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
          context.refetchAll();
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
              <OrganizationCard key={org.id} org={org} />
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

/**
 * Temporary helpers: the Organization schema does not yet have dedicated
 * dha_license or nabidh_connected fields, so we parse the notes free-text
 * as a stopgap until those columns are added via migration.
 */
const extractDhaFromNotes = (notes: string | null): string =>
  notes?.match(/DHA-[A-Z]-\d{4}-\d{3,}/)?.[0] ?? '—';

const extractNabidhFromNotes = (notes: string | null): 'connected' | 'disconnected' =>
  notes?.toLowerCase().includes('nabidh connected') ? 'connected' : 'disconnected';

const OrganizationCard = ({ org }: { org: Organization }) => {
  const navigate = useNavigate();
  const dha = extractDhaFromNotes(org.notes);
  const nabidh = extractNabidhFromNotes(org.notes);
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
          <dd className="font-bold text-emerald-700">
            {nabidh === 'connected' ? '✅ connected' : '❌ disconnected'}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            navigate(`/admin/users?org=${encodeURIComponent(org.name)}`);
          }}
          className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50"
        >
          View
        </button>
        <button
          type="button"
          onClick={() => navigate(`/admin/organizations/${org.id}`)}
          className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50"
          title="View organization details"
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
