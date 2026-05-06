import React, { useState } from 'react';
import { ChevronDown, Info, Lock, RotateCcw, ExternalLink } from 'lucide-react';

// ── Chip ──────────────────────────────────────────────────────────────────────
export function Chip({ label, color = 'slate' }: { label: string; color?: 'slate' | 'teal' | 'amber' | 'red' | 'blue' | 'green' }) {
  const colors: Record<string, string> = {
    slate: 'rgba(51,65,85,0.6)',
    teal:  'rgba(13,148,136,0.15)',
    amber: 'rgba(245,158,11,0.15)',
    red:   'rgba(239,68,68,0.15)',
    blue:  'rgba(59,130,246,0.15)',
    green: 'rgba(34,197,94,0.15)',
  };
  const text: Record<string, string> = {
    slate: '#94A3B8',
    teal:  '#2DD4BF',
    amber: '#F59E0B',
    red:   '#EF4444',
    blue:  '#60A5FA',
    green: '#4ADE80',
  };
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 font-medium"
      style={{ background: colors[color], color: text[color], fontSize: 10, letterSpacing: '0.02em' }}
    >
      {label}
    </span>
  );
}

// ── DirtyDot ──────────────────────────────────────────────────────────────────
export function DirtyDot() {
  return <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: '#F59E0B', flexShrink: 0 }} />;
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  description,
  onReset,
  crossLink,
  crossLinkLabel,
}: {
  title: string;
  description?: string;
  onReset?: () => void;
  crossLink?: string;
  crossLinkLabel?: string;
}) {
  return (
    <div className="mb-6 pb-4" style={{ borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18 }}>
            {title}
          </h2>
          {description && <p style={{ fontSize: 12, color: '#64748B' }}>{description}</p>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {crossLink && (
            <a
              href={crossLink}
              className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
              style={{ color: '#0D9488' }}
              onClick={e => { e.preventDefault(); window.history.pushState({}, '', crossLink); window.dispatchEvent(new PopStateEvent('popstate')); }}
            >
              {crossLinkLabel ?? 'Go to dedicated page'}
              <ExternalLink size={11} />
            </a>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
              style={{ color: '#94A3B8' }}
            >
              <RotateCcw size={11} />
              Reset to defaults
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SettingCard ───────────────────────────────────────────────────────────────
export function SettingCard({
  title,
  description,
  scope,
  locked,
  inheritance,
  dirty,
  defaultValue,
  children,
}: {
  title: string;
  description?: string;
  scope?: string;
  locked?: boolean;
  inheritance?: string;
  dirty?: boolean;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl mb-4 overflow-hidden"
      style={{ background: '#1E293B', border: `1px solid ${dirty ? 'rgba(245,158,11,0.3)' : 'rgba(51,65,85,0.5)'}` }}
      role="group"
      aria-labelledby={`sc-${title.replace(/\s/g, '-')}`}
    >
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(51,65,85,0.35)' }}>
        <div className="flex items-center gap-2">
          {dirty && <DirtyDot />}
          <span
            id={`sc-${title.replace(/\s/g, '-')}`}
            className="font-semibold text-white"
            style={{ fontSize: 13 }}
          >
            {title}
          </span>
          {locked && (
            <span className="flex items-center gap-1" style={{ color: '#EF4444', fontSize: 10 }}>
              <Lock size={10} />
              Locked
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5" style={{ fontSize: 11, color: '#64748B' }}>{description}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {scope && <Chip label={`Scope: ${scope}`} color="teal" />}
          {inheritance && <Chip label={inheritance} color="blue" />}
          {defaultValue && (
            <span style={{ fontSize: 10, color: '#475569' }}>Default: {defaultValue}</span>
          )}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
export function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      aria-checked={value}
      role="switch"
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{ width: 40, height: 22, background: value ? '#0D9488' : 'rgba(51,65,85,0.6)', opacity: disabled ? 0.5 : 1 }}
    >
      <div
        className="absolute top-1 rounded-full bg-white transition-all"
        style={{ width: 14, height: 14, left: value ? 22 : 4 }}
      />
    </button>
  );
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────
export function ToggleRow({
  label,
  desc,
  value,
  onChange,
  locked,
  dirty,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  locked?: boolean;
  dirty?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0"
      style={{ borderColor: 'rgba(51,65,85,0.3)' }}
    >
      <div className="flex items-center gap-2">
        {dirty && <DirtyDot />}
        <div>
          <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>{label}</div>
          {desc && <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{desc}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {locked && <Lock size={12} color="#EF4444" />}
        <Toggle value={value} onChange={onChange} disabled={locked} />
      </div>
    </div>
  );
}

// ── SelectRow ─────────────────────────────────────────────────────────────────
export function SelectRow({
  label,
  desc,
  value,
  options,
  onChange,
  dirty,
}: {
  label: string;
  desc?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  dirty?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0 gap-4"
      style={{ borderColor: 'rgba(51,65,85,0.3)' }}
    >
      <div className="flex items-center gap-2">
        {dirty && <DirtyDot />}
        <div>
          <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>{label}</div>
          {desc && <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{desc}</div>}
        </div>
      </div>
      <div className="relative flex-shrink-0">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none rounded-lg pr-7 pl-3 py-1.5 text-white text-xs outline-none focus:ring-1"
          style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.6)', minWidth: 140, color: '#E2E8F0', focusRingColor: '#0D9488' }}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#64748B' }} />
      </div>
    </div>
  );
}

// ── TextRow ────────────────────────────────────────────────────────────────────
export function TextRow({
  label,
  desc,
  value,
  onChange,
  placeholder,
  mono,
  dirty,
}: {
  label: string;
  desc?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  dirty?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0 gap-4"
      style={{ borderColor: 'rgba(51,65,85,0.3)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {dirty && <DirtyDot />}
        <div className="min-w-0">
          <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>{label}</div>
          {desc && <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{desc}</div>}
        </div>
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 flex-shrink-0"
        style={{
          background: '#0F172A',
          border: '1px solid rgba(51,65,85,0.6)',
          color: '#E2E8F0',
          width: 200,
          fontFamily: mono ? 'DM Mono, monospace' : undefined,
        }}
      />
    </div>
  );
}

// ── NumberRow ─────────────────────────────────────────────────────────────────
export function NumberRow({
  label,
  desc,
  value,
  onChange,
  min,
  max,
  suffix,
  dirty,
}: {
  label: string;
  desc?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  dirty?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0 gap-4"
      style={{ borderColor: 'rgba(51,65,85,0.3)' }}
    >
      <div className="flex items-center gap-2">
        {dirty && <DirtyDot />}
        <div>
          <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>{label}</div>
          {desc && <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{desc}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min}
          max={max}
          className="rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.6)', color: '#E2E8F0', width: 80 }}
        />
        {suffix && <span style={{ fontSize: 11, color: '#64748B' }}>{suffix}</span>}
      </div>
    </div>
  );
}

// ── CrossLinkBanner ───────────────────────────────────────────────────────────
export function CrossLinkBanner({ message, href, label }: { message: string; href: string; label: string }) {
  const nav = (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  return (
    <div
      className="rounded-xl px-5 py-3.5 mb-4 flex items-center justify-between gap-4"
      style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)' }}
    >
      <div className="flex items-center gap-2">
        <Info size={14} color="#0D9488" />
        <span style={{ fontSize: 12, color: '#94A3B8' }}>{message}</span>
      </div>
      <a href={href} onClick={nav} className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity flex-shrink-0" style={{ color: '#0D9488' }}>
        {label} <ExternalLink size={11} />
      </a>
    </div>
  );
}

// ── SectionFooter ─────────────────────────────────────────────────────────────
export function SectionFooter({
  onSave,
  onDiscard,
  dirty,
  requiresApproval,
}: {
  onSave: () => void;
  onDiscard: () => void;
  dirty: boolean;
  requiresApproval?: boolean;
}) {
  if (!dirty) return null;
  return (
    <div
      className="flex items-center justify-between px-5 py-3 rounded-xl mt-2"
      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
    >
      <div className="flex items-center gap-2">
        <DirtyDot />
        <span style={{ fontSize: 12, color: '#94A3B8' }}>
          Unsaved changes{requiresApproval ? ' · Requires two-person approval for production' : ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDiscard}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-slate-700"
          style={{ color: '#94A3B8', border: '1px solid rgba(51,65,85,0.5)' }}
        >
          Discard
        </button>
        <button
          onClick={onSave}
          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: '#0D9488' }}
        >
          Save section
        </button>
      </div>
    </div>
  );
}

// ── LockNote ──────────────────────────────────────────────────────────────────
export function LockNote({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
      <Lock size={11} color="#EF4444" />
      <span style={{ fontSize: 11, color: '#EF4444' }}>{text}</span>
    </div>
  );
}
