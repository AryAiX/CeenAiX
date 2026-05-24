import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { formatLocaleDecimal, formatLocaleDigits, formatLocalePhoneDisplay } from '../../lib/i18n-ui';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { MapPin, Clock, Phone, Star, Search, ShoppingCart, Package, Pill } from 'lucide-react';

type StoreKey = 'lifeCare' | 'mediplus' | 'healthFirst' | 'city' | 'wellness' | 'quickMed';

interface PharmacyRow {
  id: number;
  storeKey: StoreKey;
  distanceKm: number;
  delivery: boolean;
  open24h: boolean;
  rating: number;
  reviews: number;
  phone: string;
  image: string;
}

/** English labels so search still matches when the UI is Arabic */
const PHARMACY_SEARCH_EN: Record<StoreKey, { name: string; location: string }> = {
  lifeCare: { name: 'LifeCare Pharmacy', location: 'Sheikh Zayed Road, Dubai' },
  mediplus: { name: 'MediPlus Pharmacy', location: 'Dubai Marina' },
  healthFirst: { name: 'Health First Pharmacy', location: 'Jumeirah Beach Road' },
  city: { name: 'City Pharmacy', location: 'Business Bay' },
  wellness: { name: 'Wellness Pharmacy', location: 'Downtown Dubai' },
  quickMed: { name: 'QuickMed Pharmacy', location: 'Deira City Center' },
};

const PHARMACY_DATA: PharmacyRow[] = [
  {
    id: 1,
    storeKey: 'lifeCare',
    distanceKm: 1.2,
    delivery: true,
    open24h: true,
    rating: 4.8,
    reviews: 234,
    phone: '+971 4 123 4567',
    image:
      'https://images.pexels.com/photos/5910947/pexels-photo-5910947.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 2,
    storeKey: 'mediplus',
    distanceKm: 2.5,
    delivery: true,
    open24h: false,
    rating: 4.6,
    reviews: 187,
    phone: '+971 4 234 5678',
    image:
      'https://images.pexels.com/photos/5910948/pexels-photo-5910948.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 3,
    storeKey: 'healthFirst',
    distanceKm: 3.1,
    delivery: true,
    open24h: true,
    rating: 4.9,
    reviews: 312,
    phone: '+971 4 345 6789',
    image:
      'https://images.pexels.com/photos/3683053/pexels-photo-3683053.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 4,
    storeKey: 'city',
    distanceKm: 4.2,
    delivery: false,
    open24h: false,
    rating: 4.5,
    reviews: 156,
    phone: '+971 4 456 7890',
    image:
      'https://images.pexels.com/photos/5910949/pexels-photo-5910949.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 5,
    storeKey: 'wellness',
    distanceKm: 5.0,
    delivery: true,
    open24h: false,
    rating: 4.7,
    reviews: 201,
    phone: '+971 4 567 8901',
    image: 'https://images.pexels.com/photos/208512/pexels-photo-208512.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 6,
    storeKey: 'quickMed',
    distanceKm: 6.3,
    delivery: true,
    open24h: true,
    rating: 4.4,
    reviews: 143,
    phone: '+971 4 678 9012',
    image:
      'https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
];

function pharmacySearchHaystack(
  t: (key: string) => string,
  row: PharmacyRow
): string {
  const k = row.storeKey;
  const en = PHARMACY_SEARCH_EN[k];
  const parts = [
    t(`pharmacyPage.stores.${k}.name`),
    t(`pharmacyPage.stores.${k}.location`),
    en.name,
    en.location,
  ];
  return parts.join(' ').toLowerCase();
}

export const Pharmacy: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | '24h' | 'delivery'>('all');

  const filteredPharmacies = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return PHARMACY_DATA.filter((row) => {
      const matchesSearch = !q || pharmacySearchHaystack(t, row).includes(q);
      const matchesFilter =
        selectedFilter === 'all' ||
        (selectedFilter === '24h' && row.open24h) ||
        (selectedFilter === 'delivery' && row.delivery);
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, selectedFilter, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 py-20 text-white">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/3683053/pexels-photo-3683053.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt={t('pharmacyPage.heroAlt')}
            className="h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/90 via-blue-600/90 to-blue-700/90" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl bg-white/20 p-4 shadow-2xl backdrop-blur-sm">
                <Pill className="h-16 w-16" />
              </div>
            </div>
            <h1 className="mb-6 text-5xl font-bold md:text-6xl">{t('pharmacyPage.heroTitle')}</h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-blue-50">{t('pharmacyPage.heroLead')}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('pharmacyPage.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxLength={FORM_FIELD_LIMITS.searchQuery}
                className="w-full rounded-2xl border-2 border-gray-200 bg-white py-4 pe-4 ps-12 text-lg transition-colors focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`rounded-xl px-6 py-2.5 font-medium transition-all ${
                selectedFilter === 'all'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('pharmacyPage.filterAll')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('24h')}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium transition-all ${
                selectedFilter === '24h'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Clock className="h-4 w-4" />
              {t('pharmacyPage.filter24h')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('delivery')}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium transition-all ${
                selectedFilter === 'delivery'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Package className="h-4 w-4" />
              {t('pharmacyPage.filterDelivery')}
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPharmacies.map((row) => {
            const k = row.storeKey;
            const name = t(`pharmacyPage.stores.${k}.name`);
            const location = t(`pharmacyPage.stores.${k}.location`);
            const hours = t(`pharmacyPage.stores.${k}.hours`);
            const distanceStr = t('pharmacyPage.distanceKm', {
              km: formatLocaleDecimal(row.distanceKm, i18n.language, 1),
            });
            const locationLine = t('pharmacyPage.locationDistance', {
              location,
              distance: distanceStr,
            });

            return (
              <div
                key={row.id}
                className="card-hover overflow-hidden rounded-2xl bg-white shadow-lg"
              >
                <div className="relative h-48 overflow-hidden">
                  <img src={row.image} alt={name} className="h-full w-full object-cover" />
                  <div className="absolute end-4 top-4 flex gap-2">
                    {row.open24h && (
                      <span className="flex items-center gap-1 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                        <Clock className="h-3 w-3" />
                        {t('pharmacyPage.badge24h')}
                      </span>
                    )}
                    {row.delivery && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                        <Package className="h-3 w-3" />
                        {t('pharmacyPage.badgeDelivery')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="mb-2 text-xl font-bold text-gray-900">{name}</h3>

                  <div className="mb-3 flex items-center text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="ms-1 font-semibold text-gray-900">
                      {formatLocaleDecimal(row.rating, i18n.language, 1)}
                    </span>
                    <span className="ms-1 text-sm text-gray-500">
                      {t('pharmacyPage.reviews', {
                        count: formatLocaleDigits(row.reviews, i18n.language),
                      })}
                    </span>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="flex items-start text-gray-600">
                      <MapPin className="me-2 mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-600" />
                      <span className="text-sm">{locationLine}</span>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <Clock className="me-2 h-4 w-4 flex-shrink-0 text-cyan-600" />
                      <span className="text-sm">{hours}</span>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <Phone className="me-2 h-4 w-4 flex-shrink-0 text-cyan-600" />
                      <span className="text-sm" dir="ltr">
                        {formatLocalePhoneDisplay(row.phone, i18n.language)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-2.5 font-semibold text-white shadow-md transition-all hover:from-cyan-700 hover:to-blue-700 hover:shadow-lg"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {t('pharmacyPage.orderNow')}
                    </button>
                    <button
                      type="button"
                      title={t('pharmacyPage.directions')}
                      aria-label={t('pharmacyPage.directions')}
                      className="rounded-xl border-2 border-cyan-600 px-4 py-2.5 font-semibold text-cyan-600 transition-all hover:bg-cyan-50"
                    >
                      <MapPin className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPharmacies.length === 0 && (
          <div className="py-16 text-center">
            <Package className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h3 className="mb-2 text-xl font-semibold text-gray-900">{t('pharmacyPage.noResultsTitle')}</h3>
            <p className="text-gray-600">{t('pharmacyPage.noResultsLead')}</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
