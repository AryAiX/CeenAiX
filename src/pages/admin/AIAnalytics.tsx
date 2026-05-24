import { useTranslation } from 'react-i18next';
import { BrainCircuit, MessageSquare, RefreshCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { useAdminAiAnalytics } from '../../hooks';
import { ADMIN_NAV_ITEMS } from './navItems';

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

export const AdminAiAnalytics = () => {
  const { t } = useTranslation('common');
  const { data, loading, error, refetch } = useAdminAiAnalytics();

  const sessions = data?.sessions ?? null;
  const messages = data?.messages ?? null;
  const safety = data?.safety ?? null;

  const cards = [
    {
      label: 'Sessions (7d)',
      value: sessions?.last7Days,
      icon: Sparkles,
      accent: 'from-cyan-500 to-blue-600',
    },
    {
      label: 'Sessions (30d)',
      value: sessions?.last30Days,
      icon: BrainCircuit,
      accent: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Guest sessions (30d)',
      value: sessions?.guestLast30Days,
      icon: MessageSquare,
      accent: 'from-violet-500 to-fuchsia-600',
    },
    {
      label: 'Flagged outputs (30d)',
      value: safety?.flaggedLast30Days,
      icon: ShieldAlert,
      accent: 'from-rose-500 to-orange-500',
    },
  ];

  return (
    <OpsShell
      title={t('admin.aiAnalytics.title')}
      subtitle={t('admin.aiAnalytics.subtitle')}
      eyebrow="Admin Portal"
      navItems={ADMIN_NAV_ITEMS(t)}
      accent="slate"
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          Failed to load AI analytics: {error}
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-2 inline-flex items-center gap-1 font-semibold underline"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div
                aria-hidden
                className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${card.accent} opacity-10`}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {card.label}
                </span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${card.accent} text-white`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-900">
                {loading ? '…' : formatNumber(card.value)}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <MessageSquare className="h-4 w-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wide">Messages (30d)</h2>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? '…' : formatNumber(messages?.last30Days)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Total assistant replies sent to authenticated patients and guests.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldAlert className="h-4 w-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wide">Safety</h2>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? '…' : formatNumber(safety?.flaggedLast30Days)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Outputs flagged for review in the last 30 days.
          </p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-500 shadow-sm">
        {data?.generatedAt
          ? `Generated ${new Date(data.generatedAt).toLocaleString()}`
          : 'Generated on demand.'}
      </section>
    </OpsShell>
  );
};
