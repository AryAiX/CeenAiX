import { useMemo } from 'react';
import type { LabPortalData } from '../../hooks';
import { SectionCard } from './shared/ui';

export const SettingsPage = ({ data }: { data: LabPortalData | null }) => {
  const sectionGroups = useMemo(() => {
    const settings = data?.settings ?? [];
    const map = new Map<string, typeof settings>();
    settings.forEach((s) => {
      const group = map.get(s.section) ?? [];
      group.push(s);
      map.set(s.section, group);
    });
    return Array.from(map.entries());
  }, [data?.settings]);

  return (
    <div className="space-y-4">
      {sectionGroups.map(([section, items]) => (
        <SectionCard key={section}>
          <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">{section} Settings</h2>
          <div className="space-y-4">
            {items.map((setting) => (
              <div key={setting.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{setting.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{setting.value}</div>
                  </div>
                  {setting.options.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {setting.options.map((opt) => (
                        <button type="button"
                          key={opt.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${opt.isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${setting.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {setting.enabled ? 'On' : 'Off'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  );
};
