import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Star, Search, Filter, Beaker, TestTube } from 'lucide-react';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { usePublicLaboratories } from '../../hooks';
import { formatLocaleDecimal, formatLocaleDigits } from '../../lib/i18n-ui';
import {
  displayLaboratoryHours,
  displayLaboratoryLocation,
  displayLaboratoryName,
  displayLaboratoryService,
  laboratorySearchHaystack,
} from '../../lib/laboratories-display';

export const Laboratories: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { data: laboratories, loading, error: loadError, refetch } = usePublicLaboratories();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const labList = useMemo(() => laboratories ?? [], [laboratories]);

  const filteredLaboratories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return labList.filter((lab) => {
      const matchesSearch = !q || laboratorySearchHaystack(t, lab).includes(q);
      const matchesLocation = selectedLocation === 'all' || lab.location === selectedLocation;
      return matchesSearch && matchesLocation;
    });
  }, [labList, searchQuery, selectedLocation, t]);

  const locations = useMemo(
    () => ['all', ...new Set(labList.map((lab) => lab.location).filter(Boolean))],
    [labList]
  );

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[22rem] overflow-hidden sm:h-[26rem]"
        aria-hidden
      >
        <img
          src="https://images.pexels.com/photos/3825517/pexels-photo-3825517.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt=""
          className="h-full w-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-50/80 to-gray-50" />
      </div>

      <Header />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-5 py-2.5 text-cyan-700">
            <TestTube className="h-5 w-5" />
            <span className="text-sm font-semibold">{t('laboratoryPage.heroBadge')}</span>
          </div>
          <h1 className="mb-4 text-5xl font-bold text-slate-900 md:text-6xl">{t('laboratoryPage.heroTitle')}</h1>
          <p className="mx-auto max-w-3xl text-xl text-slate-600">{t('laboratoryPage.heroLead')}</p>
        </div>

        {loadError ? (
          <div
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 font-semibold text-red-700 underline"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-lg">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                maxLength={FORM_FIELD_LIMITS.searchQuery}
                placeholder={t('laboratoryPage.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-300 py-3 pe-4 ps-12 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white py-3 pe-4 ps-12 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location === 'all'
                      ? t('laboratoryPage.allLocations')
                      : displayLaboratoryLocation(t, location)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600">{t('laboratoryPage.loading')}</p>
          </div>
        ) : filteredLaboratories.length === 0 ? (
          <div className="rounded-2xl bg-white py-12 text-center shadow-lg">
            <Beaker className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <p className="text-lg text-gray-600">{t('laboratoryPage.emptyState')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredLaboratories.map((lab) => {
              const nameDisplay = displayLaboratoryName(t, lab.slug || lab.id, lab.name);
              const locationDisplay = displayLaboratoryLocation(t, lab.location);
              const hoursDisplay = displayLaboratoryHours(t, lab.openingHours);

              return (
                <div
                  key={lab.id}
                  className={`card-hover overflow-hidden rounded-2xl bg-white shadow-lg ${
                    lab.featured ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {lab.featured && (
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 py-2 text-center text-sm font-bold text-white">
                      {t('laboratoryPage.featuredLab')}
                    </div>
                  )}

                  <div className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="mb-1 text-xl font-bold text-gray-900">{nameDisplay}</h3>
                        <div className="mb-2 flex items-center text-sm text-gray-600">
                          <MapPin className="me-1 h-4 w-4" />
                          {locationDisplay}
                        </div>
                      </div>
                      <div className="flex items-center rounded-full bg-yellow-50 px-3 py-1">
                        <Star className="me-1 h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-semibold text-gray-900">
                          {formatLocaleDecimal(lab.rating, i18n.language, 1)}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4 flex items-center text-gray-700">
                      <Clock className="me-2 h-4 w-4 text-gray-500" />
                      <span className="text-sm">{hoursDisplay}</span>
                    </div>

                    <div className="mb-4 flex items-center text-gray-700">
                      <TestTube className="me-2 h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold">
                        {t('laboratoryPage.testsAvailable', {
                          count: formatLocaleDigits(lab.testsAvailable, i18n.language),
                        })}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="mb-2 text-sm font-semibold text-gray-900">
                        {t('laboratoryPage.servicesLabel')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {lab.services.slice(0, 3).map((service, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700"
                          >
                            {displayLaboratoryService(t, service)}
                          </span>
                        ))}
                        {lab.services.length > 3 && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                            {t('laboratoryPage.moreServices', {
                              count: formatLocaleDigits(lab.services.length - 3, i18n.language),
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/find-doctor')}
                      className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 font-semibold text-white transition-all hover:from-blue-700 hover:to-cyan-700"
                    >
                      {t('laboratoryPage.bookTest')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};
