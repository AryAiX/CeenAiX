import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Star, Filter, Video, Clock, ArrowLeft, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatLocaleDecimal, formatLocaleDigits } from '../../lib/i18n-ui';
import {
  displayDoctorDirectoryLocation,
  displayDoctorDirectoryName,
  displayDoctorDirectorySpecialty,
  findDoctorSearchHaystack,
  matchesDirectorySpecialtyFilter,
} from '../../lib/find-doctor-directory';
import { GeometricBackground } from '../../components/GeometricBackground';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';

/** English `value` must match `doctors.specialty` in the database; labels are translated. */
const SPECIALTY_FILTER_OPTIONS = [
  { value: 'all', tKey: 'all' as const },
  { value: 'Cardiologist', tKey: 'cardiologist' as const },
  { value: 'Pediatrician', tKey: 'pediatrician' as const },
  { value: 'Dermatologist', tKey: 'dermatologist' as const },
  { value: 'Orthopedic Surgeon', tKey: 'orthopedicSurgeon' as const },
  { value: 'General Practitioner', tKey: 'generalPractitioner' as const },
  { value: 'Neurologist', tKey: 'neurologist' as const },
  { value: 'Gynecologist', tKey: 'gynecologist' as const },
  { value: 'Ophthalmologist', tKey: 'ophthalmologist' as const },
  { value: 'Psychiatrist', tKey: 'psychiatrist' as const },
  { value: 'Endocrinologist', tKey: 'endocrinologist' as const },
] as const;

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  location: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  available_slots: number;
  accepts_video: boolean;
  rating?: number;
}

type DoctorRow = Omit<Doctor, 'rating'>;

const doctorImages = [
  'https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/7659566/pexels-photo-7659566.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/4173239/pexels-photo-4173239.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/6129410/pexels-photo-6129410.jpeg?auto=compress&cs=tinysrgb&w=400',
];

export const FindDoctor: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('name')
        .limit(50);

      if (error) throw error;

      // Generate a stable pseudo-rating per doctor so cards don't change on
      // every re-render. Uses the doctor id as the seed so reloads stay
      // consistent until a real rating column is wired up.
      const stableRating = (id: string) => {
        let hash = 0;
        for (let i = 0; i < id.length; i += 1) {
          hash = (hash * 31 + id.charCodeAt(i)) | 0;
        }
        const normalized = Math.abs(hash % 800) / 1000;
        return Number((4.2 + normalized).toFixed(1));
      };

      const doctorsWithRatings = (data as DoctorRow[] | null)?.map((doc, index) => ({
        ...doc,
        rating: stableRating(doc.id),
        image_url: doc.image_url || doctorImages[index % doctorImages.length],
      })) || [];

      setDoctors(doctorsWithRatings);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const matchesSearch = !q || findDoctorSearchHaystack(t, doctor).includes(q);
      const matchesSpecialty = matchesDirectorySpecialtyFilter(doctor.specialty, selectedSpecialty);
      return matchesSearch && matchesSpecialty;
    });
  }, [doctors, searchTerm, selectedSpecialty, t]);

  const handleBookAppointment = () => {
    navigate('/patient/appointments/book');
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <GeometricBackground />
      <Header />

      <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-blue-50">
        <div className="absolute inset-0 z-0 opacity-15">
          <img
            src="https://images.pexels.com/photos/6129410/pexels-photo-6129410.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt={t('findDoctor.altHero')}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group mb-8 flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:text-ceenai-blue"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" />
            <span>{t('findDoctor.backToHome')}</span>
          </button>
          <div className="mb-12 animate-slide-up text-center">
            <h1 className="mb-6 text-4xl font-bold text-slate-900 md:text-6xl">
              {t('findDoctor.titleLine1')}
              <span className="block bg-gradient-to-r from-ceenai-cyan to-ceenai-blue bg-clip-text text-transparent">
                {t('findDoctor.titleLine2')}
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-xl font-medium text-slate-600">{t('findDoctor.lead')}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-8">
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-6 py-4 shadow-sm backdrop-blur-sm">
                <p className="text-3xl font-bold text-ceenai-blue">{t('findDoctor.heroDoctorsValue')}</p>
                <p className="text-sm text-slate-500">{t('findDoctor.heroDoctorsLabel')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-6 py-4 shadow-sm backdrop-blur-sm">
                <p className="text-3xl font-bold text-ceenai-blue">{t('findDoctor.heroRatingValue')}</p>
                <p className="text-sm text-slate-500">{t('findDoctor.heroRatingLabel')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-6 py-4 shadow-sm backdrop-blur-sm">
                <p className="text-3xl font-bold text-ceenai-blue">{t('findDoctor.heroAvailabilityValue')}</p>
                <p className="text-sm text-slate-500">{t('findDoctor.heroAvailabilityLabel')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur animate-scale-in">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('findDoctor.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pe-4 ps-12 text-slate-900 outline-none transition focus:border-ceenai-cyan focus:bg-white focus:ring-2 focus:ring-ceenai-cyan/20"
              />
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pe-4 ps-12 text-slate-900 outline-none transition focus:border-ceenai-cyan focus:bg-white focus:ring-2 focus:ring-ceenai-cyan/20"
              >
                {SPECIALTY_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(`findDoctor.specialties.${opt.tKey}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-slate-600">
              {t('findDoctor.doctorsAvailable', {
                count: formatLocaleDigits(filteredDoctors.length, i18n.language),
              })}
            </p>
            <div className="flex items-center gap-2 text-slate-600">
              <Award className="h-4 w-4 text-ceenai-cyan" />
              <span>{t('findDoctor.verifiedProfessionals')}</span>
            </div>
          </div>
        </div>

        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start gap-4">
                  <div className="h-20 w-20 rounded-xl bg-slate-100"></div>
                  <div className="flex-1">
                    <div className="mb-2 h-5 rounded bg-slate-100"></div>
                    <div className="h-4 w-2/3 rounded bg-slate-100"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 rounded bg-slate-100"></div>
                  <div className="h-4 w-3/4 rounded bg-slate-100"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor, index) => {
              const nameDisplay = displayDoctorDirectoryName(t, doctor.name);
              const specialtyDisplay = displayDoctorDirectorySpecialty(t, doctor.specialty);
              const locationDisplay = displayDoctorDirectoryLocation(t, doctor.location);

              return (
              <div
                key={doctor.id}
                className="group card-hover animate-scale-in overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm hover:border-ceenai-cyan/40"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-ceenai-cyan/10 to-ceenai-blue/10">
                  <img
                    src={doctor.image_url || doctorImages[index % doctorImages.length]}
                    alt={nameDisplay}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

                  {doctor.accepts_video && (
                  <div className="absolute end-4 top-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                      <Video className="h-4 w-4 text-ceenai-blue" />
                    <span className="text-xs font-semibold text-slate-700">{t('findDoctor.videoConsult')}</span>
                    </div>
                  )}

                  <div className="absolute bottom-4 start-4 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold text-slate-900">
                      {doctor.rating != null
                        ? formatLocaleDecimal(doctor.rating, i18n.language, 1)
                        : ''}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="mb-1 text-xl font-bold text-slate-900 transition-colors group-hover:text-ceenai-blue">
                    {nameDisplay}
                  </h3>
                  <p className="mb-3 font-semibold text-ceenai-blue">{specialtyDisplay}</p>

                  <div className="mb-4 space-y-2">
                    <div className="flex items-center text-sm text-slate-600">
                      <MapPin className="me-2 h-4 w-4 text-slate-400" />
                      <span>{locationDisplay}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <Clock className="me-2 h-4 w-4 text-slate-400" />
                      <span className="font-medium text-green-600">
                        {t('findDoctor.slotsAvailable', {
                          slots: formatLocaleDigits(doctor.available_slots, i18n.language),
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBookAppointment()}
                    className="w-full rounded-2xl bg-gradient-to-r from-ceenai-cyan to-ceenai-blue py-3 font-semibold text-white shadow-sm transition-all duration-300 hover:shadow-lg"
                  >
                    {t('findDoctor.bookAppointment')}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {!loading && filteredDoctors.length === 0 && (
          <div className="animate-fade-in py-20 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
              <Search className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-slate-900">{t('findDoctor.noResultsTitle')}</h3>
            <p className="mb-6 text-slate-600">{t('findDoctor.noResultsLead')}</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedSpecialty('all');
              }}
              className="rounded-full bg-gradient-to-r from-ceenai-cyan to-ceenai-blue px-6 py-3 font-semibold text-white transition-all hover:shadow-lg"
            >
              {t('findDoctor.clearFilters')}
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};
