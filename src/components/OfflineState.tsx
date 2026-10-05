import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OfflineStateProps {
  description?: string;
  onRetry?: () => void;
}

interface OfflineNoticeProps {
  hasData: boolean;
  onRetry?: () => void;
}

export const OfflineState = ({ description, onRetry }: OfflineStateProps) => {
  const { t } = useTranslation('common');

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
        <WifiOff className="h-8 w-8" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-gray-900">{t('shared.offline.title')}</h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-600">
        {description ?? t('shared.offline.genericBody')}
      </p>
      <p className="mt-3 text-sm text-gray-500">{t('shared.offline.autoRetry')}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-ceenai-cyan to-ceenai-blue px-5 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.01]"
        >
          {t('shared.retry')}
        </button>
      ) : null}
    </div>
  );
};

export const OfflineNotice = ({ hasData, onRetry }: OfflineNoticeProps) => {
  const { t } = useTranslation('common');

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <p>{hasData ? t('shared.offline.staleNotice') : t('shared.offline.noDataNotice')}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="ms-auto font-semibold underline">
          {t('shared.retry')}
        </button>
      ) : null}
    </div>
  );
};
