import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export const PrivacyPolicy = () => {
  const { t } = useTranslation('common');

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
        <section>
          <h2 className="text-lg font-semibold text-slate-900">{t('privacy.collectionTitle')}</h2>
          <p>{t('privacy.collectionBody')}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">{t('privacy.useTitle')}</h2>
          <p>{t('privacy.useBody')}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">{t('privacy.retentionTitle')}</h2>
          <p>{t('privacy.retentionBody')}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">{t('privacy.contactTitle')}</h2>
          <p>{t('privacy.contactBody')}</p>
        </section>
      </div>

      <div className="mt-10">
        <Link to="/" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
          {t('privacy.backHome')}
        </Link>
      </div>
    </div>
  );
};
