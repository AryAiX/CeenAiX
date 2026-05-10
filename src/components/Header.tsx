import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const openRegistration = (role: 'patient' | 'doctor') => {
    navigate(`/auth/register?role=${role}&reset=1`);
  };

  const menuItems = useMemo(
    () => [
      { label: t('header.doctors'), path: '/find-doctor' },
      { label: t('header.clinics'), path: '/find-clinic' },
      { label: t('header.pharmacy'), path: '/pharmacy' },
      { label: t('header.laboratories'), path: '/laboratories' },
      { label: t('header.insurance'), path: '/insurance' },
    ],
    [t]
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-3 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ceenai-cyan"
            onClick={() => navigate('/')}
            aria-label={t('header.home')}
          >
            <img src="/favicon.svg" alt="" aria-hidden className="h-10 w-10 rounded-xl" />
            <div>
              <span className="block bg-gradient-to-r from-ceenai-cyan via-ceenai-blue to-ceenai-navy bg-clip-text text-2xl font-bold text-transparent">
                CeenAiX
              </span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                {t('brand.tagline')}
              </span>
            </div>
          </button>

          <div className="hidden items-center space-x-8 md:flex">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  type="button"
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className="relative py-2 text-sm font-medium text-slate-600 transition-colors hover:text-ceenai-blue"
                >
                  {item.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-ceenai-cyan to-ceenai-blue rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher dense />
            <button
              type="button"
              onClick={() => openRegistration('patient')}
              className="rounded-full bg-gradient-to-r from-ceenai-cyan to-ceenai-blue px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-xl"
            >
              {t('header.patient')}
            </button>
            <button
              type="button"
              onClick={() => openRegistration('doctor')}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-ceenai-cyan hover:text-ceenai-blue"
            >
              {t('header.doctor')}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
