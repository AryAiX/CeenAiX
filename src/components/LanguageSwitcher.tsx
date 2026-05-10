import { useTranslation } from 'react-i18next';

type LanguageSwitcherProps = {
  /** Smaller padding for dense toolbars */
  dense?: boolean;
  className?: string;
  /** Use on dark navigation bars (doctor portal) */
  variant?: 'light' | 'dark';
};

export const LanguageSwitcher = ({
  dense,
  className = '',
  variant = 'light',
}: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation('common');
  const active = i18n.language.startsWith('ar') ? 'ar' : 'en';

  const setLang = (next: 'en' | 'ar') => {
    void i18n.changeLanguage(next);
  };

  const btn =
    dense === true
      ? 'px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide'
      : 'px-3 py-1.5 text-xs font-semibold uppercase tracking-wide';

  const shell =
    variant === 'dark'
      ? 'border border-white/20 bg-white/10 backdrop-blur-sm'
      : 'border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm';

  const inactive = variant === 'dark' ? 'text-white/80 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-50';

  const activeBtn =
    variant === 'dark' ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-sm';

  return (
    <div
      className={`inline-flex rounded-full p-0.5 ${shell} ${className}`}
      role="group"
      aria-label={t('language.switcherAriaLabel', { defaultValue: 'Language' })}
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={active === 'en'}
        className={`${btn} rounded-full transition ${active === 'en' ? activeBtn : inactive}`}
      >
        {t('language.enShort')}
      </button>
      <button
        type="button"
        onClick={() => setLang('ar')}
        aria-pressed={active === 'ar'}
        className={`${btn} rounded-full transition ${active === 'ar' ? activeBtn : inactive}`}
      >
        {t('language.arShort')}
      </button>
    </div>
  );
};
