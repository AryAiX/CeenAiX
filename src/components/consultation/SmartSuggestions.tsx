import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Lightbulb, Pill, ShieldAlert, UserPlus, X } from 'lucide-react';
import type { SmartSuggestion } from '../../types';

interface SmartSuggestionsProps {
  suggestions: SmartSuggestion[];
  isLoading: boolean;
  patientId: string;
  appointmentId: string;
  onDismiss: (id: string) => void;
}

const stringValue = (value: Record<string, unknown>, key: string): string | null => {
  const candidate = value[key];
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
};

export function SmartSuggestions({
  suggestions,
  isLoading,
  patientId,
  appointmentId,
  onDismiss,
}: SmartSuggestionsProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const iconFor = (kind: SmartSuggestion['kind']) => {
    switch (kind) {
      case 'lab_order':
        return <FlaskConical className="h-4 w-4 text-cyan-600" />;
      case 'medication':
        return <Pill className="h-4 w-4 text-violet-600" />;
      case 'allergy':
        return <ShieldAlert className="h-4 w-4 text-amber-600" />;
      case 'referral':
        return <UserPlus className="h-4 w-4 text-blue-600" />;
      default:
        return <Lightbulb className="h-4 w-4 text-slate-500" />;
    }
  };

  const actionFor = (suggestion: SmartSuggestion): { label: string; onClick: () => void } | null => {
    const base = `patient=${patientId}&appointment=${appointmentId}`;
    switch (suggestion.kind) {
      case 'lab_order': {
        const test = stringValue(suggestion.value, 'test_name') ?? suggestion.label;
        return {
          label: t('doctor.consultationScribe.suggestions.addLabOrder'),
          onClick: () => navigate(`/doctor/lab-orders/new?${base}&test=${encodeURIComponent(test)}`),
        };
      }
      case 'medication': {
        const medication = stringValue(suggestion.value, 'name') ?? suggestion.label;
        return {
          label: t('doctor.consultationScribe.suggestions.addMedication'),
          onClick: () =>
            navigate(`/doctor/prescriptions/new?${base}&medication=${encodeURIComponent(medication)}`),
        };
      }
      case 'allergy':
        return {
          label: t('doctor.consultationScribe.suggestions.updateAllergies'),
          onClick: () => navigate(`/doctor/patients/${patientId}`),
        };
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        {t('doctor.consultationScribe.suggestions.loading')}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-600" />
        <h4 className="text-sm font-bold text-slate-900">{t('doctor.consultationScribe.suggestions.title')}</h4>
      </div>
      <p className="mb-3 text-xs text-slate-500">{t('doctor.consultationScribe.suggestions.subtitle')}</p>
      <div className="space-y-2">
        {suggestions.map((suggestion) => {
          const action = actionFor(suggestion);
          return (
            <div
              key={suggestion.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5">{iconFor(suggestion.kind)}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{suggestion.label}</p>
                  {suggestion.detail ? <p className="text-xs text-slate-500">{suggestion.detail}</p> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {action ? (
                  <button
                    type="button"
                    onClick={action.onClick}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    {action.label}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDismiss(suggestion.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
                  aria-label={t('doctor.consultationScribe.suggestions.dismiss')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
