import { Shield, AlertTriangle, Monitor, Globe } from 'lucide-react';
import { AUTH_TREND, SECURITY_KPIS } from '../../data/securityData';
import { S, SCard, SectionHeader, SStatusDot } from './SecurityPrimitives';

const PORTAL_POLICIES = [
  { portal: 'Admin', passwordMin: 14, mfa: 'Required', mfaFactors: 'FIDO2, WebAuthn, TOTP', session: '4h', deviceTrust: true, riskBased: true },
  { portal: 'Doctor', passwordMin: 12, mfa: 'Required', mfaFactors: 'TOTP, WebAuthn, SMS', session: '8h', deviceTrust: false, riskBased: true },
  { portal: 'Patient', passwordMin: 8, mfa: 'Risk-based', mfaFactors: 'TOTP, SMS, Email', session: '30d', deviceTrust: false, riskBased: true },
  { portal: 'Pharmacy', passwordMin: 12, mfa: 'Required', mfaFactors: 'TOTP, SMS', session: '8h', deviceTrust: false, riskBased: false },
  { portal: 'Lab & Radiology', passwordMin: 12, mfa: 'Required', mfaFactors: 'TOTP, SMS', session: '8h', deviceTrust: false, riskBased: false },
  { portal: 'Insurance', passwordMin: 12, mfa: 'Required', mfaFactors: 'TOTP, WebAuthn', session: '8h', deviceTrust: false, riskBased: true },
];

const ACTIVE_SESSIONS = [
  { user: 'Dr. Tariq Al-Mansouri', portal: 'Admin', ip: '10.0.4.22', country: 'AE', device: 'MacBook Pro (Safari)', started: '11:00', idle: '2m' },
  { user: 'Sara Al-Naqbi', portal: 'Admin', ip: '10.0.4.41', country: 'AE', device: 'Windows 11 (Chrome)', started: '07:00', idle: '14m' },
  { user: 'Khalid Mansoor', portal: 'Admin', ip: '102.89.42.11', country: 'NG', device: 'iPhone (Safari)', started: '09:15', idle: '2h 8m' },
  { user: 'Fatima Al-Zaabi', portal: 'Pharmacy', ip: '10.0.2.88', country: 'AE', device: 'iPad (Chrome)', started: '08:30', idle: '41m' },
];

export function AuthenticationTab() {
  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* MFA coverage alert */}
      {SECURITY_KPIS.mfaCoverage.value < 100 && (
        <div className="p-3 rounded-xl flex items-start gap-3"
          style={{ background: S.warningBg, border: `1px solid ${S.warningBorder}` }}>
          <AlertTriangle size={14} style={{ color: S.warningLight, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: S.warningLight }}>
              MFA coverage {SECURITY_KPIS.mfaCoverage.value}% — {(100 - SECURITY_KPIS.mfaCoverage.value).toFixed(1)}% of users not enrolled
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: S.text3 }}>
              Admin coverage: {SECURITY_KPIS.mfaCoverage.adminCoverage}% (target 100%). 1 privileged user (Dr. Yasir Arafat) has no MFA and is under suspension.
            </div>
          </div>
        </div>
      )}

      {/* Per-portal policy matrix */}
      <SCard className="p-5">
        <SectionHeader title="Authentication Policies by Portal">
          <button className="text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
            Edit policies
          </button>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: S.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {['Portal', 'Min Password', 'MFA', 'Factors', 'Session', 'Device Trust', 'Risk-based'].map(h => (
                  <th key={h} className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PORTAL_POLICIES.map(p => (
                <tr key={p.portal} style={{ borderBottom: `1px solid ${S.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,148,136,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="py-2 pr-3">
                    <div className="text-xs font-semibold" style={{ color: S.text1 }}>{p.portal}</div>
                  </td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{p.passwordMin} chars</td>
                  <td className="py-2 pr-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: p.mfa === 'Required' ? S.successBg : S.warningBg, color: p.mfa === 'Required' ? S.successLight : S.warningLight }}>
                      {p.mfa}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text3 }}>{p.mfaFactors}</td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{p.session}</td>
                  <td className="py-2 pr-3">
                    <SStatusDot ok={p.deviceTrust} />
                  </td>
                  <td className="py-2 pr-3">
                    <SStatusDot ok={p.riskBased} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Auth observability */}
        <SCard className="p-5">
          <SectionHeader title="Auth Observability (24h)" />
          <div className="space-y-3">
            {[
              { label: 'Total sign-ins', value: AUTH_TREND.reduce((s, h) => s + h.success, 0).toLocaleString(), color: S.successLight },
              { label: 'Failed sign-ins', value: AUTH_TREND.reduce((s, h) => s + h.failed, 0).toLocaleString(), color: S.warningLight },
              { label: 'Blocked sign-ins', value: AUTH_TREND.reduce((s, h) => s + h.blocked, 0).toLocaleString(), color: S.errorLight },
              { label: 'MFA challenges', value: AUTH_TREND.reduce((s, h) => s + h.mfaChallenged, 0).toLocaleString(), color: S.tealLight },
              { label: 'MFA challenge success rate', value: '98.4%', color: S.successLight },
              { label: 'Account lockouts', value: '14', color: S.warningLight },
              { label: 'Step-up triggers (risk-based)', value: '28', color: S.blueLight },
            ].map(m => (
              <div key={m.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${S.border}` }}>
                <span className="text-[10px]" style={{ color: S.text3 }}>{m.label}</span>
                <span className="text-[10px] font-semibold" style={{ color: m.color, fontFamily: 'DM Mono, monospace' }}>{m.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${S.border}` }}>
            <div className="text-[10px] font-semibold mb-2" style={{ color: S.text2 }}>Top failed login sources</div>
            {[
              { ip: '185.220.101.44', country: 'RU', attempts: 428, blocked: true },
              { ip: '45.141.84.201', country: 'RU', attempts: 284, blocked: true },
              { ip: '102.89.42.11', country: 'NG', attempts: 14, blocked: false },
            ].map(s => (
              <div key={s.ip} className="flex items-center justify-between text-[10px] py-1" style={{ borderBottom: `1px solid ${S.border}` }}>
                <span style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{s.ip}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: S.text3 }}>{s.country}</span>
                  <span style={{ color: S.errorLight, fontFamily: 'DM Mono, monospace' }}>{s.attempts}</span>
                  {s.blocked && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: S.errorBg, color: S.errorLight }}>Blocked</span>}
                </div>
              </div>
            ))}
          </div>
        </SCard>

        {/* Active sessions */}
        <SCard className="p-5">
          <SectionHeader title="Active Sessions">
            <button className="text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: S.errorBg, color: S.errorLight, border: `1px solid ${S.errorBorder}` }}>
              Revoke all
            </button>
          </SectionHeader>
          <div className="space-y-2">
            {ACTIVE_SESSIONS.map((sess, i) => (
              <div key={i} className="p-2.5 rounded-xl" style={{ background: S.bg1, border: `1px solid ${sess.country !== 'AE' ? S.warningBorder : S.border}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-semibold" style={{ color: S.text1 }}>{sess.user}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                      <span style={{ color: S.text3 }}>{sess.portal}</span>
                      <span style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>{sess.ip}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px]"
                        style={{ background: sess.country !== 'AE' ? S.warningBg : S.bg2, color: sess.country !== 'AE' ? S.warningLight : S.text3 }}>
                        {sess.country}
                      </span>
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: S.text3 }}>{sess.device}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[9px]" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>Started {sess.started}</div>
                    <div className="text-[9px]" style={{ color: S.text3 }}>Idle {sess.idle}</div>
                    <button className="mt-1 text-[9px] px-2 py-0.5 rounded" style={{ background: S.errorBg, color: S.errorLight }}>Revoke</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SCard>
      </div>

      {/* Brute force & risk signals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: 'Account Lockout Policy', items: [
            { label: 'Max failed attempts', value: '10 in 15m' },
            { label: 'Lockout duration', value: '30 minutes' },
            { label: 'Admin override', value: 'Required' },
            { label: 'CAPTCHA threshold', value: '5 failed' },
          ]},
          { title: 'Risk Signals Used', items: [
            { label: 'New device', value: 'Step-up MFA' },
            { label: 'New country', value: 'Step-up MFA' },
            { label: 'Known-bad IP', value: 'Block' },
            { label: 'Unusual hour', value: 'Log + alert' },
          ]},
          { title: 'Passwordless Adoption', items: [
            { label: 'FIDO2 registered', value: '3 admins' },
            { label: 'WebAuthn registered', value: '2 users' },
            { label: 'Passkey (iOS/Android)', value: '0 users' },
            { label: 'Campaign active', value: 'No' },
          ]},
        ].map(card => (
          <SCard key={card.title} className="p-4">
            <SectionHeader title={card.title} />
            <div className="space-y-1.5">
              {card.items.map(f => (
                <div key={f.label} className="flex justify-between py-1 text-[10px]" style={{ borderBottom: `1px solid ${S.border}` }}>
                  <span style={{ color: S.text3 }}>{f.label}</span>
                  <span style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
                </div>
              ))}
            </div>
          </SCard>
        ))}
      </div>
    </div>
  );
}
