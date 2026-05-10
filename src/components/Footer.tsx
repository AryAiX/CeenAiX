import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Footer: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const trustPills = [t('footer.supportLine'), t('footer.aiHealthChat'), t('brand.tagline')];

  return (
    <footer className="ceenai-mesh border-t border-slate-200 bg-slate-950 px-4 py-14 text-slate-300">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-6 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-200">{t('brand.tagline')}</p>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">{t('footer.blurb')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {trustPills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/20">
                <img src="/favicon.svg" alt="" aria-hidden className="h-8 w-8 rounded-xl" />
              </div>
              <div>
                <span className="block text-xl font-bold text-white">CeenAiX</span>
                <span className="block text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
                  {t('brand.tagline')}
                </span>
              </div>
            </div>
            <p className="max-w-sm leading-relaxed text-slate-400">{t('footer.blurb')}</p>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t('footer.services')}
            </h4>
            <ul className="space-y-2">
              <li>
                <button type="button" onClick={() => navigate('/find-doctor')} className="transition-colors hover:text-ceenai-cyan">
                  {t('footer.findDoctors')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/find-clinic')} className="transition-colors hover:text-ceenai-cyan">
                  {t('footer.findClinics')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/ai-chat')} className="transition-colors hover:text-ceenai-cyan">
                  {t('footer.aiHealthChat')}
                </button>
              </li>
            </ul>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t('footer.resources')}
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/health-education')}
                  className="transition-colors hover:text-ceenai-cyan"
                >
                  {t('footer.healthEducation')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/insurance')} className="transition-colors hover:text-ceenai-cyan">
                  {t('header.insurance')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/auth/login')} className="transition-colors hover:text-ceenai-cyan">
                  {t('footer.signIn')}
                </button>
              </li>
            </ul>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t('footer.contact')}
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>support@ceenaix.com</li>
              <li>1-800-CEENAIX</li>
              <li>{t('footer.supportLine')}</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-800 pt-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>{t('footer.legal')}</p>
          <p>{t('footer.legalSub')}</p>
        </div>
      </div>
    </footer>
  );
};
