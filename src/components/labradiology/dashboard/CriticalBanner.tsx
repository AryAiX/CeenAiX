import React, { useState, useEffect } from 'react';
import { Phone, X, AlertTriangle } from 'lucide-react';

const CriticalBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const [seconds, setSeconds] = useState(44 * 60);

  useEffect(() => {
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  if (dismissed) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="flex-shrink-0 flex items-center gap-4 px-5 py-2.5" style={{ background: 'linear-gradient(90deg, #7F1D1D, #991B1B)', borderBottom: '2px solid #EF4444' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center animate-pulse" style={{ background: 'rgba(239,68,68,0.3)', border: '2px solid #EF4444' }}>
          <AlertTriangle style={{ width: 16, height: 16, color: '#FCA5A5' }} />
        </div>
        <div>
          <div className="font-black text-white" style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, letterSpacing: '-0.01em' }}>
            CRITICAL VALUE — UNNOTIFIED
          </div>
          <div className="text-red-200" style={{ fontSize: 11 }}>
            Ibrahim Al Marzouqi · ICU Bed 4 · Potassium <span className="font-bold">6.8 mEq/L ↑↑</span> (ref 3.5–5.0) · Dr. Ahmed Al Rashidi
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-center">
          <div className="font-black" style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, color: seconds < 10 * 60 ? '#FCA5A5' : '#FED7AA' }}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>unnotified</div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white hover:opacity-90 transition-all hover:scale-105"
          style={{ background: '#EF4444', fontSize: 12, boxShadow: '0 4px 16px rgba(239,68,68,0.5)' }}>
          <Phone style={{ width: 14, height: 14 }} />
          Notify Doctor Now
        </button>

        <button onClick={() => setDismissed(true)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <X style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.6)' }} />
        </button>
      </div>
    </div>
  );
};

export default CriticalBanner;
