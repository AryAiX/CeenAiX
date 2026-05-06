import React, { useState, useEffect } from 'react';
import { Map } from 'lucide-react';
import { orgDots, OrgDot } from '../../data/superAdminData';

const nav = (href: string) => {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const typeColor: Record<OrgDot['type'], string> = {
  hospital: '#3B82F6',
  clinic: '#0D9488',
  pharmacy: '#059669',
  lab: '#6366F1',
  insurance: '#F59E0B',
};

const typeLegend: { type: OrgDot['type']; label: string }[] = [
  { type: 'hospital', label: 'Hospital' },
  { type: 'clinic', label: 'Clinic' },
  { type: 'pharmacy', label: 'Pharmacy' },
  { type: 'lab', label: 'Lab / Imaging' },
  { type: 'insurance', label: 'Insurance' },
];

const UAE_PATH = `M 60,8 L 88,10 L 100,18 L 100,60 L 92,72 L 88,88 L 80,90 L 74,80 L 70,72 L 64,68 L 55,70 L 48,78 L 42,80 L 38,76 L 35,68 L 30,65 L 22,66 L 14,64 L 8,58 L 4,52 L 8,46 L 14,40 L 18,32 L 24,22 L 32,14 L 42,10 Z`;

interface Tooltip {
  org: OrgDot;
  x: number;
  y: number;
}

const UAEMap: React.FC = () => {
  const [viewMode, setViewMode] = useState<'map' | 'satellite'>('map');
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [visibleDots, setVisibleDots] = useState<Set<string>>(new Set());

  useEffect(() => {
    orgDots.forEach((dot, i) => {
      setTimeout(() => {
        setVisibleDots(prev => new Set([...prev, dot.id]));
      }, 200 + i * 60);
    });
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
        <div className="flex items-center gap-2">
          <Map style={{ width: 16, height: 16, color: '#2DD4BF' }} />
          <span className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
            Connected Organizations — UAE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#2DD4BF' }}>
            {orgDots.length} organizations
          </span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(51,65,85,0.8)' }}>
            {(['map', 'satellite'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className="px-3 py-1 capitalize transition-colors"
                style={{
                  fontSize: 11,
                  background: viewMode === m ? '#0D9488' : 'rgba(30,41,59,0.5)',
                  color: viewMode === m ? '#fff' : '#94A3B8',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map SVG */}
      <div className="flex-1 relative overflow-hidden" style={{ background: viewMode === 'satellite' ? '#0D1F0D' : '#1a2744' }}>
        <svg
          viewBox="0 0 104 96"
          className="w-full h-full"
          style={{ position: 'absolute', inset: 0 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[20, 40, 60, 80].map(v => (
            <React.Fragment key={v}>
              <line x1={v} y1={0} x2={v} y2={96} stroke="rgba(51,65,85,0.3)" strokeWidth="0.3" strokeDasharray="2,3" />
              <line x1={0} y1={v} x2={104} y2={v} stroke="rgba(51,65,85,0.3)" strokeWidth="0.3" strokeDasharray="2,3" />
            </React.Fragment>
          ))}

          {/* UAE outline */}
          <path
            d={UAE_PATH}
            fill={viewMode === 'satellite' ? 'rgba(20,50,30,0.7)' : 'rgba(26,55,90,0.6)'}
            stroke="rgba(99,130,170,0.5)"
            strokeWidth="0.5"
          />

          {/* Org dots */}
          {orgDots.map(dot => {
            const color = typeColor[dot.type];
            const isVisible = visibleDots.has(dot.id);
            const isPulse = dot.sessions >= 100;
            const cx = (dot.x / 100) * 104;
            const cy = (dot.y / 100) * 96;
            return (
              <g key={dot.id} onClick={() => nav('/admin/workspaces')} style={{ cursor: 'pointer' }}>
                {isPulse && isVisible && (
                  <>
                    <circle cx={cx} cy={cy} r="6" fill="none" stroke={color} strokeWidth="0.5" opacity="0.2">
                      <animate attributeName="r" values="5;10;5" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={cx} cy={cy} r="4" fill="none" stroke={color} strokeWidth="0.5" opacity="0.3">
                      <animate attributeName="r" values="3;7;3" dur="2s" repeatCount="indefinite" begin="0.5s" />
                      <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" begin="0.5s" />
                    </circle>
                  </>
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isVisible ? (dot.isPrimary ? 3.5 : 2.5) : 0}
                  fill={color}
                  stroke="rgba(15,23,42,0.8)"
                  strokeWidth="0.5"
                  style={{ cursor: 'pointer', transition: 'r 0.3s ease' }}
                  onMouseEnter={() => setTooltip({ org: dot, x: cx, y: cy })}
                  onMouseLeave={() => setTooltip(null)}
                />
              </g>
            );
          })}

          {/* Tooltip */}
          {tooltip && (() => {
            const tx = Math.min(tooltip.x + 2, 68);
            const ty = Math.max(tooltip.y - 16, 4);
            return (
              <foreignObject x={tx} y={ty} width="32" height="20" style={{ overflow: 'visible' }}>
                <div
                  style={{
                    background: '#0F172A',
                    border: '1px solid rgba(51,65,85,0.9)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    minWidth: 140,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{tooltip.org.name}</div>
                  <div style={{ fontSize: 9, color: '#94A3B8' }}>{tooltip.org.type} · {tooltip.org.city}</div>
                  <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: '#2DD4BF' }}>
                    {tooltip.org.sessions} sessions today
                  </div>
                  <div style={{ fontSize: 9, color: '#34D399' }}>{tooltip.org.active} active now</div>
                </div>
              </foreignObject>
            );
          })()}
        </svg>

        {/* Controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          {['+', '−', '⌖'].map(s => (
            <button
              key={s}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.7)', fontSize: 14 }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-2.5 flex-shrink-0 flex-wrap" style={{ borderTop: '1px solid rgba(51,65,85,0.5)' }}>
        {typeLegend.map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: typeColor[type] }} />
            <span style={{ fontSize: 10, color: '#94A3B8' }}>{label}</span>
          </div>
        ))}
        <span className="ml-auto" style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace' }}>
          UAE · Dubai, Abu Dhabi, Sharjah, RAK, Ajman, Fujairah
        </span>
      </div>
    </div>
  );
};

export default UAEMap;
