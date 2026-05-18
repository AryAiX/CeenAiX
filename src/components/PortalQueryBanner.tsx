interface PortalQueryBannerProps {
  error: string | null;
  onRetry?: () => void;
  retryLabel?: string;
}

export const PortalQueryBanner = ({ error, onRetry, retryLabel = 'Retry' }: PortalQueryBannerProps) => {
  if (!error) return null;

  return (
    <div
      className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      <p>{error}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 font-semibold text-red-700 underline"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
};
