import { useState } from 'react';
import { Database, Cpu, HardDrive, Globe, Layers, Brain, Shield, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Wifi, Server } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  content: React.ReactNode;
}

function ProgressBar({ pct, warning = 70, critical = 85 }: { pct: number; warning?: number; critical?: number }) {
  const color = pct >= critical ? '#EF4444' : pct >= warning ? '#F59E0B' : '#10B981';
  return (
    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(51,65,85,0.5)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function MetricRow({ label, value, extra, warning }: { label: string; value: string; extra?: string; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
      <span style={{ fontSize: 12, color: '#94A3B8' }}>{label}</span>
      <div className="text-right">
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: warning ? '#F59E0B' : '#CBD5E1' }}>{value}</span>
        {extra && <div style={{ fontSize: 10, color: '#475569' }}>{extra}</div>}
      </div>
    </div>
  );
}

const storageGrowthData = Array.from({ length: 30 }, (_, i) => ({
  day: `${30 - i}d`,
  used: parseFloat((1.5 + (i * 0.01) + Math.random() * 0.05).toFixed(2)),
  forecast: parseFloat((1.5 + (i * 0.011)).toFixed(2)),
})).reverse();

const DatabaseSection = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {[
      { name: 'Primary (PostgreSQL 15.4)', lag: '—', conns: '340/500', slow: 2, disk: 36, backup: '5h ago · 2m 8s', restoreTested: '2026-04-15' },
      { name: 'Replica 1 (PostgreSQL 15.4)', lag: '12ms', conns: '180/500', slow: 0, disk: 36, backup: '5h ago · 2m 12s', restoreTested: '2026-04-15' },
      { name: 'Replica 2 (PostgreSQL 15.4)', lag: '18ms', conns: '120/500', slow: 0, disk: 36, backup: '5h ago · 2m 15s', restoreTested: '2026-04-15' },
    ].map(db => (
      <div key={db.name} className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600 }}>{db.name}</span>
          <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
        </div>
        <MetricRow label="Replication lag" value={db.lag} />
        <MetricRow label="Connections" value={db.conns} warning={db.conns.startsWith('34')} />
        <MetricRow label="Slow queries (5m)" value={String(db.slow)} warning={db.slow > 0} />
        <MetricRow label="Last backup" value={db.backup} />
        <MetricRow label="Restore tested" value={db.restoreTested} />
        <div className="mt-3">
          <div className="flex justify-between mb-1">
            <span style={{ fontSize: 10, color: '#64748B' }}>Disk usage</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#94A3B8' }}>{db.disk}%</span>
          </div>
          <ProgressBar pct={db.disk} />
        </div>
        <button className="mt-3 text-[10px]" style={{ color: '#0D9488' }}>Open query analyzer →</button>
      </div>
    ))}
  </div>
);

const CacheSection = () => (
  <div className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      {[
        { label: 'Hit Rate', value: '97.4%', color: '#10B981' },
        { label: 'Memory Used', value: '12.4 / 32 GB', color: '#CBD5E1' },
        { label: 'Evictions (5m)', value: '0', color: '#10B981' },
        { label: 'Avg Latency', value: '2ms', color: '#10B981' },
      ].map(m => (
        <div key={m.label}>
          <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{m.label}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: m.color, fontWeight: 700 }}>{m.value}</div>
        </div>
      ))}
    </div>
    <ProgressBar pct={38} />
    <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>38% capacity used</div>
  </div>
);

const QueuesSection = () => (
  <div className="space-y-3">
    {[
      { name: 'NABIDH Submissions', depth: 142, oldest: '4m 12s', throughput: '340 in / 338 out', consumers: 4, dlq: 0, status: 'OK' },
      { name: 'Email Notifications', depth: 28, oldest: '0m 45s', throughput: '1.5k in / 1.5k out', consumers: 8, dlq: 2, status: 'OK' },
      { name: 'Clinical Record Sync', depth: 0, oldest: '—', throughput: '0 in / 0 out', consumers: 2, dlq: 0, status: 'OK' },
      { name: 'Report Generation', depth: 6, oldest: '1m 20s', throughput: '12 in / 12 out', consumers: 1, dlq: 1, status: 'OK' },
    ].map(q => {
      const ageMin = parseInt(q.oldest);
      const ageColor = ageMin >= 15 ? '#EF4444' : ageMin >= 5 ? '#F59E0B' : '#10B981';
      return (
        <div key={q.name} className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600 }}>{q.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>Healthy</span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            <div><div style={{ fontSize: 9, color: '#475569' }}>Depth</div><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#CBD5E1' }}>{q.depth}</div></div>
            <div><div style={{ fontSize: 9, color: '#475569' }}>Oldest</div><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: ageColor }}>{q.oldest}</div></div>
            <div><div style={{ fontSize: 9, color: '#475569' }}>Throughput</div><div style={{ fontSize: 10, color: '#94A3B8' }}>{q.throughput}</div></div>
            <div><div style={{ fontSize: 9, color: '#475569' }}>Consumers</div><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#CBD5E1' }}>{q.consumers}</div></div>
            <div><div style={{ fontSize: 9, color: '#475569' }}>DLQ</div><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: q.dlq > 0 ? '#F59E0B' : '#10B981' }}>{q.dlq}</div></div>
          </div>
        </div>
      );
    })}
    {/* Worker pools */}
    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 8 }}>Worker Pools</div>
    <div className="grid grid-cols-2 gap-3">
      {[
        { pool: 'Default workers', active: 6, total: 20, jobsMin: 284, avgDuration: '1.2s', failRate: '0.01%' },
        { pool: 'Heavy compute workers', active: 2, total: 8, jobsMin: 12, avgDuration: '18s', failRate: '0.00%' },
      ].map(w => (
        <div key={w.pool} className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
          <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600, marginBottom: 8 }}>{w.pool}</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div><div style={{ color: '#475569' }}>Active / Total</div><div style={{ fontFamily: 'DM Mono, monospace', color: '#CBD5E1' }}>{w.active}/{w.total}</div></div>
            <div><div style={{ color: '#475569' }}>Jobs/min</div><div style={{ fontFamily: 'DM Mono, monospace', color: '#CBD5E1' }}>{w.jobsMin}</div></div>
            <div><div style={{ color: '#475569' }}>Avg duration</div><div style={{ fontFamily: 'DM Mono, monospace', color: '#CBD5E1' }}>{w.avgDuration}</div></div>
            <div><div style={{ color: '#475569' }}>Fail rate</div><div style={{ fontFamily: 'DM Mono, monospace', color: '#10B981' }}>{w.failRate}</div></div>
          </div>
          <ProgressBar pct={Math.round((w.active / w.total) * 100)} />
          <div style={{ fontSize: 9, color: '#475569', marginTop: 4 }}>{Math.round((w.active / w.total) * 100)}% capacity</div>
        </div>
      ))}
    </div>
  </div>
);

const ObjectStorageCDNSection = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      {/* Object storage */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4" style={{ color: '#64748B' }} />
          <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600 }}>Object Storage (S3-compatible)</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Used', value: '4.2 TB', color: '#CBD5E1' },
            { label: 'Total', value: '20 TB', color: '#64748B' },
            { label: 'Egress (24h)', value: '142 GB', color: '#0D9488' },
            { label: 'Growth rate', value: '+23 GB/day', color: '#CBD5E1' },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 9, color: '#475569' }}>{m.label}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
        <ProgressBar pct={21} />
        <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>21% used · ~180 days runway</div>
        <div className="mt-3" style={{ background: '#1E293B', borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>Storage growth (30d)</div>
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart data={storageGrowthData}>
              <Area type="monotone" dataKey="used" stroke="#0D9488" fill="rgba(13,148,136,0.1)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="forecast" stroke="#F59E0B" fill="none" strokeWidth={1} strokeDasharray="4 2" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CDN */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4" style={{ color: '#64748B' }} />
          <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600 }}>CDN</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Cache hit rate', value: '94.2%', color: '#10B981' },
            { label: 'Bandwidth (24h)', value: '8.4 TB', color: '#CBD5E1' },
            { label: 'UAE latency', value: '12ms', color: '#10B981' },
            { label: 'GCC latency', value: '28ms', color: '#10B981' },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 9, color: '#475569' }}>{m.label}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>Regional latency</div>
        {[
          { region: 'UAE (Primary)', latency: 12, max: 100 },
          { region: 'Saudi Arabia', latency: 28, max: 100 },
          { region: 'Kuwait', latency: 34, max: 100 },
          { region: 'International', latency: 82, max: 100 },
        ].map(r => (
          <div key={r.region} className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 9, color: '#64748B', width: 80, flexShrink: 0 }}>{r.region}</span>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(51,65,85,0.5)' }}>
              <div className="h-full rounded-full" style={{ width: `${(r.latency / r.max) * 100}%`, background: r.latency < 50 ? '#10B981' : '#F59E0B' }} />
            </div>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#94A3B8', width: 32, textAlign: 'right' }}>{r.latency}ms</span>
          </div>
        ))}
      </div>
    </div>

    {/* Search index */}
    <div className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
      <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600, marginBottom: 8 }}>Search Index</div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Indexing lag', value: '8s', color: '#10B981' },
          { label: 'Query latency', value: '42ms', color: '#10B981' },
          { label: 'Error rate', value: '0.05%', color: '#F59E0B' },
          { label: 'Documents', value: '18.4M', color: '#CBD5E1' },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: m.color, fontWeight: 700 }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const NetworkingSection = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      {/* Region health */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
        <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600, marginBottom: 8 }}>Region Health</div>
        {[
          { region: 'me-central-1 (UAE Primary)', status: 'Healthy', latency: '—', color: '#10B981' },
          { region: 'eu-west-1 (DR Secondary)', status: 'Standby', latency: '82ms', color: '#0D9488' },
        ].map(r => (
          <div key={r.region} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>{r.region}</span>
            <div className="flex items-center gap-2">
              {r.latency !== '—' && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>{r.latency}</span>}
              <span style={{ fontSize: 10, color: r.color, fontWeight: 600 }}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* DDoS + WAF */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
        <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600, marginBottom: 8 }}>DDoS & WAF</div>
        {[
          { label: 'DDoS shield', value: 'Active', color: '#10B981' },
          { label: 'WAF rules active', value: '7', color: '#CBD5E1' },
          { label: 'WAF blocks (24h)', value: '7,849', color: '#F59E0B' },
          { label: 'Bot challenges (24h)', value: '3,210', color: '#F59E0B' },
        ].map(m => (
          <div key={m.label} className="flex justify-between py-1.5 border-b" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>{m.label}</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: m.color }}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>

    {/* DNS + Certificates */}
    <div className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
      <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600, marginBottom: 8 }}>DNS & TLS Certificates</div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
              {['Domain', 'DNS', 'Issuer', 'Expiry', 'Days', 'Auto-renew'].map(h => (
                <th key={h} className="text-left py-1.5 pr-4 text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { domain: '*.ceenaixhealth.ae', dns: 'OK', issuer: "Let's Encrypt", expiry: '2026-05-13', days: 9, auto: true },
              { domain: 'nabidh-prod.ceenaixhealth.ae', dns: 'OK', issuer: 'DHA PKI CA', expiry: '2026-06-12', days: 39, auto: false },
              { domain: 'api.ceenaixhealth.ae', dns: 'OK', issuer: "Let's Encrypt", expiry: '2026-06-01', days: 28, auto: true },
              { domain: 'internal.ceenaixhealth.ae', dns: 'OK', issuer: 'Internal CA', expiry: '2027-01-01', days: 242, auto: true },
            ].map(cert => {
              const daysColor = cert.days < 7 ? '#EF4444' : cert.days < 30 ? '#F59E0B' : '#10B981';
              return (
                <tr key={cert.domain} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                  <td className="py-2 pr-4" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#CBD5E1' }}>{cert.domain}</td>
                  <td className="py-2 pr-4"><span style={{ fontSize: 9, color: '#10B981' }}>✓ {cert.dns}</span></td>
                  <td className="py-2 pr-4" style={{ fontSize: 10, color: '#64748B' }}>{cert.issuer}</td>
                  <td className="py-2 pr-4" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#94A3B8' }}>{cert.expiry}</td>
                  <td className="py-2 pr-4">
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: daysColor }}>{cert.days}d</span>
                  </td>
                  <td className="py-2 pr-4">
                    <span style={{ fontSize: 9, color: cert.auto ? '#10B981' : '#F59E0B' }}>{cert.auto ? 'Auto (ACME)' : 'Manual'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* Traffic */}
    <div className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
      <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600, marginBottom: 8 }}>Network Traffic (24h)</div>
      <div className="grid grid-cols-3 gap-4 mb-3">
        {[
          { label: 'Ingress', value: '24.8 GB', color: '#0D9488' },
          { label: 'Egress', value: '142.1 GB', color: '#0891B2' },
          { label: 'Internal', value: '8.4 GB', color: '#64748B' },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 9, color: '#475569' }}>{m.label}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: m.color, fontWeight: 700 }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AISection = () => (
  <div className="space-y-3">
    {[
      { name: 'Anthropic (Claude)', latency: '1.2s', tokens: '2.4M', errRate: '0.00%', rateLimit: '62%', status: 'Operational', violations: 4 },
      { name: 'Azure OpenAI (GPT-4o)', latency: '1.8s', tokens: '840k', errRate: '0.00%', rateLimit: '28%', status: 'Operational', violations: 0 },
      { name: 'Speech-to-Text', latency: '320ms', tokens: '—', errRate: '0.02%', rateLimit: '15%', status: 'Operational', violations: 0 },
      { name: 'OCR Service', latency: '890ms', tokens: '—', errRate: '0.01%', rateLimit: '8%', status: 'Operational', violations: 0 },
    ].map(ai => (
      <div key={ai.name} className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600 }}>{ai.name}</span>
          <div className="flex items-center gap-2">
            {ai.violations > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>{ai.violations} guardrail violations</span>}
            <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div><div style={{ fontSize: 9, color: '#475569' }}>Avg Latency</div><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#CBD5E1' }}>{ai.latency}</div></div>
          <div><div style={{ fontSize: 9, color: '#475569' }}>Tokens Used</div><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#0D9488' }}>{ai.tokens}</div></div>
          <div><div style={{ fontSize: 9, color: '#475569' }}>Error Rate</div><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#10B981' }}>{ai.errRate}</div></div>
          <div>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>Rate Limit {ai.rateLimit}</div>
            <ProgressBar pct={parseInt(ai.rateLimit)} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const BackupDRSection = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
      <div className="font-semibold mb-3" style={{ fontSize: 12, color: '#CBD5E1' }}>Backup Status</div>
      {[
        { store: 'db-primary', last: '2026-05-04 06:00 GST', size: '2.1 GB', duration: '4m 12s', status: 'OK', restoreTested: '2026-04-15' },
        { store: 'db-replica-1', last: '2026-05-04 06:02 GST', size: '2.1 GB', duration: '4m 15s', status: 'OK', restoreTested: '2026-04-15' },
        { store: 'object-storage', last: '2026-05-04 02:00 GST', size: '4.2 TB', duration: '38m', status: 'OK', restoreTested: '2026-03-22' },
      ].map(b => (
        <div key={b.store} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
          <div>
            <div style={{ fontSize: 11, color: '#CBD5E1' }}>{b.store}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#475569' }}>{b.last}</div>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 10, color: '#94A3B8' }}>{b.size} · {b.duration}</div>
            <div style={{ fontSize: 9, color: '#475569' }}>Restore tested {b.restoreTested}</div>
          </div>
          <CheckCircle className="w-3 h-3 ml-2" style={{ color: '#10B981' }} />
        </div>
      ))}
      <button className="mt-3 w-full py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8', border: '1px solid rgba(51,65,85,0.6)' }}>Trigger backup verification</button>
    </div>
    <div className="rounded-xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
      <div className="font-semibold mb-3" style={{ fontSize: 12, color: '#CBD5E1' }}>DR Readiness</div>
      {[
        { label: 'RTO Target vs Measured', target: '4h', measured: '2h 18m', status: 'Met' },
        { label: 'RPO Target vs Measured', target: '1h', measured: '4m', status: 'Met' },
        { label: 'Last DR Drill', target: '—', measured: '2026-03-15', status: 'OK' },
        { label: 'Next DR Drill', target: '—', measured: '2026-09-15', status: 'Scheduled' },
      ].map(d => (
        <div key={d.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{d.label}</span>
          <div className="text-right">
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#CBD5E1' }}>{d.measured}</span>
            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>{d.status}</span>
          </div>
        </div>
      ))}
      <button className="mt-3 w-full py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8', border: '1px solid rgba(51,65,85,0.6)' }}>Schedule DR drill</button>
    </div>
  </div>
);

export default function InfrastructureTab() {
  const [open, setOpen] = useState<string[]>(['databases', 'queues', 'networking']);

  const sections: Section[] = [
    { id: 'databases', label: 'Databases', icon: Database, content: <DatabaseSection /> },
    { id: 'caches', label: 'Cache (Redis)', icon: Cpu, content: <CacheSection /> },
    { id: 'queues', label: 'Queues & Workers', icon: Layers, content: <QueuesSection /> },
    { id: 'storage', label: 'Object Storage, CDN & Search', icon: HardDrive, content: <ObjectStorageCDNSection /> },
    { id: 'networking', label: 'Networking & DNS', icon: Wifi, content: <NetworkingSection /> },
    { id: 'ai', label: 'AI Services', icon: Brain, content: <AISection /> },
    { id: 'backups', label: 'Backups & DR', icon: Shield, content: <BackupDRSection /> },
  ];

  return (
    <div className="p-6 space-y-3">
      {sections.map(sec => {
        const Icon = sec.icon;
        const isOpen = open.includes(sec.id);
        return (
          <div key={sec.id} className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
            <button onClick={() => setOpen(prev => isOpen ? prev.filter(x => x !== sec.id) : [...prev, sec.id])} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/20 transition-colors">
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" style={{ color: '#64748B' }} />
                <span className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{sec.label}</span>
              </div>
              {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: '#475569' }} /> : <ChevronRight className="w-4 h-4" style={{ color: '#475569' }} />}
            </button>
            {isOpen && <div className="px-5 pb-5">{sec.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
