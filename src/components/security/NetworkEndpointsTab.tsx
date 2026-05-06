import { Shield, AlertTriangle, Globe, Server, Monitor, Mail } from 'lucide-react';
import { S, SCard, SectionHeader, SStatusDot } from './SecurityPrimitives';

const WAF_RULES = [
  { rule: 'OWASP Core Rule Set 3.3', enabled: true, mode: 'Block', triggered24h: 2841, falsePos: 0.8 },
  { rule: 'SQL Injection (custom)', enabled: true, mode: 'Block', triggered24h: 481, falsePos: 0.2 },
  { rule: 'XSS (custom)', enabled: true, mode: 'Block', triggered24h: 284, falsePos: 1.1 },
  { rule: 'Rate limiting — API (1k/min)', enabled: true, mode: 'Block', triggered24h: 142, falsePos: 0.0 },
  { rule: 'Geo-block (high-risk countries)', enabled: true, mode: 'Block', triggered24h: 891, falsePos: 0.0 },
  { rule: 'Bot detection (ML model)', enabled: true, mode: 'Challenge', triggered24h: 3210, falsePos: 4.2 },
  { rule: 'PHI in URL params', enabled: true, mode: 'Block', triggered24h: 2, falsePos: 0.0 },
];

const API_ENDPOINTS = [
  { endpoint: '/api/v1/patients', method: 'GET', auth: 'JWT + scope', rateLimit: '100/min', lastScan: '2026-05-04', vulns: 0, status: 'Healthy' },
  { endpoint: '/api/v1/prescriptions', method: 'POST', auth: 'JWT + scope', rateLimit: '50/min', lastScan: '2026-05-04', vulns: 0, status: 'Healthy' },
  { endpoint: '/api/v1/documents', method: 'GET', auth: 'JWT + scope', rateLimit: '200/min', lastScan: '2026-05-03', vulns: 1, status: 'Warning' },
  { endpoint: '/api/v1/nabidh/submit', method: 'POST', auth: 'mTLS + JWT', rateLimit: '30/min', lastScan: '2026-05-04', vulns: 0, status: 'Healthy' },
  { endpoint: '/api/v1/admin', method: 'ALL', auth: 'JWT + MFA token', rateLimit: '20/min', lastScan: '2026-05-04', vulns: 0, status: 'Healthy' },
  { endpoint: '/api/v1/webhooks', method: 'POST', auth: 'HMAC-SHA256', rateLimit: '500/min', lastScan: '2026-05-02', vulns: 0, status: 'Healthy' },
];

const CSPM_FINDINGS = [
  { resource: 'S3 bucket: phi-documents-prod', severity: 'Critical', finding: 'Public access not blocked', remediation: 'Enable block public access', status: 'Open' },
  { resource: 'Security group: sg-api-prod', severity: 'High', finding: 'Port 22 open to 0.0.0.0/0', remediation: 'Restrict to bastion IPs', status: 'In Progress' },
  { resource: 'IAM role: lambda-execution', severity: 'Medium', finding: 'Wildcard S3 permissions', remediation: 'Apply least privilege', status: 'Open' },
  { resource: 'RDS: postgres-primary', severity: 'Low', finding: 'Minor version auto-upgrade disabled', remediation: 'Enable auto minor version upgrade', status: 'Open' },
  { resource: 'CloudTrail: prod-trail', severity: 'Low', finding: 'Log file validation disabled', remediation: 'Enable log file validation', status: 'Resolved' },
];

const EDR_ENDPOINTS = [
  { host: 'app-server-01', os: 'Ubuntu 22.04', agent: '7.4.1', status: 'Protected', threats: 0, lastSeen: '1m ago' },
  { host: 'app-server-02', os: 'Ubuntu 22.04', agent: '7.4.1', status: 'Protected', threats: 0, lastSeen: '1m ago' },
  { host: 'db-primary', os: 'Ubuntu 22.04', agent: '7.4.1', status: 'Protected', threats: 0, lastSeen: '2m ago' },
  { host: 'worker-01', os: 'Ubuntu 22.04', agent: '7.3.9', status: 'Outdated', threats: 0, lastSeen: '5m ago' },
  { host: 'bastion-host', os: 'Amazon Linux 2', agent: '7.4.1', status: 'Protected', threats: 0, lastSeen: '3m ago' },
];

const EMAIL_CONTROLS = [
  { control: 'SPF', configured: true, value: 'v=spf1 include:amazonses.com -all', result: 'Pass' },
  { control: 'DKIM', configured: true, value: 'RSA-2048 · ceenaix._domainkey', result: 'Pass' },
  { control: 'DMARC', configured: true, value: 'p=reject; rua=mailto:dmarc@ceenaix.ae', result: 'Pass' },
  { control: 'BIMI', configured: false, value: '—', result: 'Not set' },
  { control: 'MTA-STS', configured: true, value: 'mode=enforce; max_age=86400', result: 'Pass' },
];

const severityColors: Record<string, { bg: string; text: string }> = {
  Critical: { bg: S.errorBg, text: S.errorLight },
  High: { bg: S.orangeBg, text: S.orangeLight },
  Medium: { bg: S.warningBg, text: S.warningLight },
  Low: { bg: S.blueBg, text: S.blueLight },
};

export function NetworkEndpointsTab() {
  const openCspm = CSPM_FINDINGS.filter(f => f.status !== 'Resolved');
  const criticalCspm = CSPM_FINDINGS.filter(f => f.severity === 'Critical' && f.status !== 'Resolved');

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {(criticalCspm.length > 0) && (
        <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: S.errorBg, border: `1px solid ${S.errorBorder}` }}>
          <AlertTriangle size={14} style={{ color: S.errorLight, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: S.errorLight }}>
              {criticalCspm.length} critical cloud misconfiguration — S3 PHI bucket public access not blocked
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: S.text3 }}>
              Immediate remediation required. {openCspm.length} total open CSPM findings across cloud posture.
            </div>
          </div>
        </div>
      )}

      {/* WAF */}
      <SCard className="p-5">
        <SectionHeader title="Web Application Firewall (WAF)">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: S.successLight }} />
              <span className="text-[10px]" style={{ color: S.successLight }}>Active · Block mode</span>
            </div>
            <button className="text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
              Manage rules
            </button>
          </div>
        </SectionHeader>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Requests blocked (24h)', value: '7,849', color: S.errorLight },
            { label: 'Rules active', value: WAF_RULES.filter(r => r.enabled).length.toString(), color: S.tealLight },
            { label: 'Bot challenges (24h)', value: '3,210', color: S.warningLight },
          ].map(k => (
            <div key={k.label} className="p-3 rounded-xl" style={{ background: S.bg1, border: `1px solid ${S.border}` }}>
              <div className="text-[10px] mb-1" style={{ color: S.text3 }}>{k.label}</div>
              <div className="text-lg font-bold" style={{ color: k.color, fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: S.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {['Rule', 'Mode', 'Triggered (24h)', 'False Positive %', 'Enabled'].map(h => (
                  <th key={h} className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WAF_RULES.map(r => (
                <tr key={r.rule} style={{ borderBottom: `1px solid ${S.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,148,136,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="py-2 pr-3 text-xs" style={{ color: S.text1 }}>{r.rule}</td>
                  <td className="py-2 pr-3">
                    <span className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: r.mode === 'Block' ? S.errorBg : S.warningBg, color: r.mode === 'Block' ? S.errorLight : S.warningLight }}>
                      {r.mode}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{r.triggered24h.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: r.falsePos > 2 ? S.warningLight : S.text2, fontFamily: 'DM Mono, monospace' }}>{r.falsePos}%</td>
                  <td className="py-2 pr-3"><SStatusDot ok={r.enabled} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* API Security */}
        <SCard className="p-5">
          <SectionHeader title="API Security">
            <button className="text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
              <Globe size={9} className="inline mr-1" />Run DAST scan
            </button>
          </SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: S.bg3 }}>
                <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                  {['Endpoint', 'Auth', 'Rate limit', 'Vulns', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {API_ENDPOINTS.map(ep => (
                  <tr key={ep.endpoint} style={{ borderBottom: `1px solid ${S.border}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,148,136,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="py-2 pr-3">
                      <div style={{ color: S.tealLight, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{ep.endpoint}</div>
                      <div className="text-[9px]" style={{ color: S.text3 }}>{ep.method}</div>
                    </td>
                    <td className="py-2 pr-3 text-[9px]" style={{ color: S.text3 }}>{ep.auth}</td>
                    <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{ep.rateLimit}</td>
                    <td className="py-2 pr-3">
                      <span className="text-[10px] font-bold" style={{ color: ep.vulns > 0 ? S.errorLight : S.successLight, fontFamily: 'DM Mono, monospace' }}>{ep.vulns}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: ep.status === 'Healthy' ? S.successBg : S.warningBg, color: ep.status === 'Healthy' ? S.successLight : S.warningLight }}>
                        {ep.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SCard>

        {/* EDR */}
        <SCard className="p-5">
          <SectionHeader title="Endpoint Detection & Response (EDR)">
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: S.text3 }}>
              <Monitor size={10} />
              <span>{EDR_ENDPOINTS.length} endpoints</span>
            </div>
          </SectionHeader>
          <div className="space-y-2">
            {EDR_ENDPOINTS.map(ep => (
              <div key={ep.host} className="flex items-center justify-between p-2.5 rounded-xl"
                style={{ background: S.bg1, border: `1px solid ${ep.status === 'Outdated' ? S.warningBorder : S.border}` }}>
                <div className="flex items-center gap-2.5">
                  <Server size={12} style={{ color: ep.status === 'Outdated' ? S.warningLight : S.tealLight }} />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: S.text1, fontFamily: 'DM Mono, monospace' }}>{ep.host}</div>
                    <div className="text-[9px]" style={{ color: S.text3 }}>{ep.os} · Agent {ep.agent}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px]" style={{ color: S.text3 }}>{ep.lastSeen}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{ background: ep.status === 'Protected' ? S.successBg : S.warningBg, color: ep.status === 'Protected' ? S.successLight : S.warningLight }}>
                    {ep.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2.5 rounded-xl text-[10px]" style={{ background: S.bg1, border: `1px solid ${S.border}` }}>
            <div className="flex justify-between">
              <span style={{ color: S.text3 }}>Coverage</span>
              <span style={{ color: S.successLight, fontFamily: 'DM Mono, monospace' }}>{EDR_ENDPOINTS.filter(e => e.status === 'Protected').length}/{EDR_ENDPOINTS.length} protected</span>
            </div>
          </div>
        </SCard>
      </div>

      {/* CSPM */}
      <SCard className="p-5">
        <SectionHeader title="Cloud Security Posture (CSPM)">
          <button className="text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
            Run scan
          </button>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: S.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {['Resource', 'Severity', 'Finding', 'Remediation', 'Status'].map(h => (
                  <th key={h} className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CSPM_FINDINGS.map(f => (
                <tr key={f.resource} style={{ borderBottom: `1px solid ${S.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,148,136,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text1, fontFamily: 'DM Mono, monospace' }}>{f.resource}</td>
                  <td className="py-2 pr-3">
                    <span className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: severityColors[f.severity]?.bg, color: severityColors[f.severity]?.text }}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2 }}>{f.finding}</td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text3 }}>{f.remediation}</td>
                  <td className="py-2 pr-3">
                    <span className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        background: f.status === 'Resolved' ? S.successBg : f.status === 'In Progress' ? S.warningBg : S.errorBg,
                        color: f.status === 'Resolved' ? S.successLight : f.status === 'In Progress' ? S.warningLight : S.errorLight,
                      }}>
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>

      {/* Email Security */}
      <SCard className="p-5">
        <SectionHeader title="Email Security (ceenaix.ae)">
          <div className="flex items-center gap-1.5">
            <Mail size={12} style={{ color: S.tealLight }} />
            <span className="text-[10px]" style={{ color: S.tealLight }}>All critical controls passing</span>
          </div>
        </SectionHeader>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
          {EMAIL_CONTROLS.map(c => (
            <div key={c.control} className="p-3 rounded-xl" style={{ background: S.bg1, border: `1px solid ${c.configured ? S.tealBorder : S.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold" style={{ color: S.text1 }}>{c.control}</span>
                <SStatusDot ok={c.configured} />
              </div>
              <div className="text-[9px] mb-1.5" style={{ color: S.text3, fontFamily: 'DM Mono, monospace', wordBreak: 'break-all' }}>{c.value}</div>
              <span className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: c.result === 'Pass' ? S.successBg : S.warningBg, color: c.result === 'Pass' ? S.successLight : S.warningLight }}>
                {c.result}
              </span>
            </div>
          ))}
        </div>
      </SCard>
    </div>
  );
}
