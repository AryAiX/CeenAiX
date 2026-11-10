import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';

interface PrivacySection {
  id: string;
  title: string;
  items: string[];
}

export const PrivacyPolicy = () => {
  const { t } = useTranslation('common');
  const { hash } = useLocation();
  const sections = t('privacy.sections', { returnObjects: true }) as PrivacySection[];

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100">
          <Shield className="h-6 w-6 text-teal-700" />
        </div>
        <div>
          <h1 className="font-playfair text-3xl font-bold text-slate-900">
            {t('privacy.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t('privacy.updated')}</p>
        </div>
      </div>

      <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
        <p>{t('privacy.intro')}</p>
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <ul className="mt-2 list-disc space-y-2 ps-5">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-10">
        <Link to="/" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
          {t('privacy.backHome')}
        </Link>
      </div>
    </div>
  );
};
