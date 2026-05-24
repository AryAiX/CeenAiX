import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Star, Clock, Phone,
  Filter, Building2, Users, Calendar, Mail,
  ChevronDown, ChevronUp,
  Ambulance, ParkingCircle, Shield, Navigation,
  Award, TrendingUp, Stethoscope, Heart
} from 'lucide-react';
import { useFacilityDoctors, usePublicFacilities } from '../../hooks';
import type { PublicFacility } from '../../types/facility';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';

const DEFAULT_FACILITY_IMAGE =
  'https://images.pexels.com/photos/668300/pexels-photo-668300.jpeg?auto=compress&cs=tinysrgb&w=800';

const DEFAULT_DOCTOR_IMAGE =
  'https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=200';

export const FindClinic: React.FC = () => {
  const navigate = useNavigate();
  const { data: facilities, loading, error: loadError, refetch } = usePublicFacilities();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [showEmergencyOnly, setShowEmergencyOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedFacilityId, setExpandedFacilityId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'name'>('rating');
  const [showNavMenu, setShowNavMenu] = useState<string | null>(null);

  const { data: facilityDoctors, loading: doctorsLoading } = useFacilityDoctors(expandedFacilityId);

  const facilityList = useMemo(() => facilities ?? [], [facilities]);

  const toggleFacilityExpansion = (facilityId: string) => {
    setExpandedFacilityId((current) => (current === facilityId ? null : facilityId));
  };

  const allCities = useMemo(
    () => Array.from(new Set(facilityList.map((facility) => facility.city))),
    [facilityList]
  );
  const allSpecialties = useMemo(
    () => Array.from(new Set(facilityList.flatMap((facility) => facility.specialties))).sort(),
    [facilityList]
  );

  const openGoogleMaps = (facility: PublicFacility) => {
    if (facility.latitude == null || facility.longitude == null) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowNavMenu(null);
  };

  const openWaze = (facility: PublicFacility) => {
    if (facility.latitude == null || facility.longitude == null) return;
    const url = `https://waze.com/ul?ll=${facility.latitude},${facility.longitude}&navigate=yes`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowNavMenu(null);
  };

  const filteredFacilities = useMemo(
    () =>
      facilityList
        .filter((facility) => {
          const matchesSearch =
            facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            facility.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            facility.specialties.some((specialty) =>
              specialty.toLowerCase().includes(searchTerm.toLowerCase())
            );

          const matchesType = selectedType === 'all' || facility.facilityType === selectedType;
          const matchesCity = selectedCity === 'all' || facility.city === selectedCity;
          const matchesSpecialty =
            selectedSpecialty === 'all' || facility.specialties.includes(selectedSpecialty);
          const matchesEmergency = !showEmergencyOnly || facility.emergencyServices;
          const matchesRating = facility.rating >= minRating;

          return (
            matchesSearch &&
            matchesType &&
            matchesCity &&
            matchesSpecialty &&
            matchesEmergency &&
            matchesRating
          );
        })
        .sort((a, b) => {
          if (sortBy === 'rating') return b.rating - a.rating;
          return a.name.localeCompare(b.name);
        }),
    [
      facilityList,
      minRating,
      searchTerm,
      selectedCity,
      selectedSpecialty,
      selectedType,
      showEmergencyOnly,
      sortBy,
    ]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.pexels.com/photos/668300/pexels-photo-668300.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Modern hospital"
          className="w-full h-96 object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white"></div>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 right-1/2 w-96 h-96 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <Header />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center animate-fade-in">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-4 py-2 text-sm font-semibold text-cyan-700 shadow-sm">
            <Building2 className="h-4 w-4" />
            <span>Facility discovery</span>
          </div>
          <h1 className="mb-3 bg-gradient-to-r from-ceenai-blue to-ceenai-cyan bg-clip-text text-5xl font-bold text-transparent">
            Find Healthcare Facilities
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Discover top-rated hospitals and clinics with experienced doctors near you
          </p>
        </div>

        {loadError ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 text-sm font-semibold text-red-700 underline"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur transition-all">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search Hospitals & Clinics
              </label>
              <div className="relative group">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-ceenai-blue" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  maxLength={FORM_FIELD_LIMITS.searchQuery}
                  placeholder="Search by name, location, or specialty..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pl-12 pr-4 text-slate-900 outline-none transition focus:border-ceenai-cyan focus:bg-white focus:ring-2 focus:ring-ceenai-cyan/20"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="md:self-end rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3 font-medium text-slate-700 transition-all hover:bg-slate-100"
            >
              <span className="inline-flex items-center gap-2">
                <Filter className="h-5 w-5" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-6 space-y-4 border-t border-slate-200 pt-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="all">All Types</option>
                    <option value="hospital">Hospitals</option>
                    <option value="clinic">Clinics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="all">All Cities</option>
                    {allCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Specialty</label>
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="all">All Specialties</option>
                    {allSpecialties.map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'rating' | 'name')}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Minimum Rating: {minRating === 0 ? 'All' : `${minRating}+ Stars`}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={minRating}
                      onChange={(e) => setMinRating(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex items-center gap-1 min-w-[120px]">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 transition-all ${
                            star <= minRating
                              ? 'text-yellow-500 fill-current scale-110'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={showEmergencyOnly}
                      onChange={(e) => setShowEmergencyOnly(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                      24/7 Emergency Only
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Found <span className="font-bold text-blue-600">{filteredFacilities.length}</span> {filteredFacilities.length === 1 ? 'facility' : 'facilities'}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading facilities...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredFacilities.map((facility, index) => (
              <div
                key={facility.id}
                className="card-hover bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-gray-100 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="lg:flex">
                  <div className="lg:w-96 h-72 lg:h-auto relative overflow-hidden group">
                    <img
                      src={facility.imageUrl ?? DEFAULT_FACILITY_IMAGE}
                      alt={facility.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {facility.rating >= 4.5 && (
                      <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg animate-bounce-subtle">
                        <Award className="w-3.5 h-3.5" />
                        Top Rated
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                            {facility.name}
                          </h3>
                          {facility.facilityType === 'hospital' ? (
                            <Building2 className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Heart className="w-5 h-5 text-cyan-600" />
                          )}
                        </div>
                        <p className="text-blue-600 font-medium capitalize flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                          {facility.facilityType}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {facility.emergencyServices && (
                          <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-md animate-pulse-subtle">
                            <Ambulance className="w-3.5 h-3.5" />
                            24/7 Emergency
                          </span>
                        )}
                        {facility.parkingAvailable && (
                          <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow-md">
                            <ParkingCircle className="w-3.5 h-3.5" />
                            Parking
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">{facility.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-gray-700 group hover:text-blue-600 transition-colors">
                        <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 group-hover:animate-bounce-subtle" />
                        <span className="text-sm">{facility.address}</span>
                      </div>
                      {facility.phone ? (
                        <div className="flex items-center gap-2 text-gray-700 group hover:text-blue-600 transition-colors">
                          <Phone className="w-4 h-4 text-blue-600 flex-shrink-0 group-hover:animate-bounce-subtle" />
                          <a href={`tel:${facility.phone}`} className="text-sm hover:text-blue-600">
                            {facility.phone}
                          </a>
                        </div>
                      ) : null}
                      {facility.email && (
                        <div className="flex items-center gap-2 text-gray-700 group hover:text-blue-600 transition-colors">
                          <Mail className="w-4 h-4 text-blue-600 flex-shrink-0 group-hover:animate-bounce-subtle" />
                          <a href={`mailto:${facility.email}`} className="text-sm hover:text-blue-600">
                            {facility.email}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg">
                        <Star className="w-5 h-5 text-yellow-500 fill-current flex-shrink-0 animate-pulse-subtle" />
                        <span className="font-bold text-gray-900">{facility.rating.toFixed(1)}</span>
                        <span className="text-gray-500 text-sm">({facility.totalReviews} reviews)</span>
                      </div>
                    </div>

                    {facility.specialties && facility.specialties.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                          <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                          Specialties
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {facility.specialties.slice(0, 6).map((specialty, index) => (
                            <span
                              key={index}
                              className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold hover:scale-105 transition-transform cursor-default"
                            >
                              {specialty}
                            </span>
                          ))}
                          {facility.specialties.length > 6 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{facility.specialties.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {facility.insuranceAccepted && facility.insuranceAccepted.length > 0 && (
                      <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <p className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-green-600" />
                          Insurance Accepted ({facility.insuranceAccepted.length} providers)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {facility.insuranceAccepted.map((insurance, index) => (
                            <span
                              key={index}
                              className="bg-white border-2 border-green-300 text-green-800 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-default"
                            >
                              {insurance}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => toggleFacilityExpansion(facility.id)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-xl transform hover:scale-105"
                      >
                        <Users className="w-4 h-4" />
                        {expandedFacilityId === facility.id ? 'Hide' : 'View'} Doctors
                        {expandedFacilityId === facility.id ?
                          <ChevronUp className="w-4 h-4" /> :
                          <ChevronDown className="w-4 h-4" />
                        }
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/find-doctor')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition-all transform hover:scale-105 hover:shadow-md"
                      >
                        <Calendar className="w-4 h-4" />
                        Book Appointment
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowNavMenu(showNavMenu === facility.id ? null : facility.id)}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 font-semibold text-white shadow-md transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/30"
                        >
                          <Navigation className="w-4 h-4" />
                          Get Directions
                          <ChevronDown className={`w-4 h-4 transition-transform ${showNavMenu === facility.id ? 'rotate-180' : ''}`} />
                        </button>
                        {showNavMenu === facility.id && (
                          <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-10 animate-fade-in min-w-[200px]">
                            <button
                              onClick={() => openGoogleMaps(facility)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left text-gray-700 hover:text-blue-600 font-medium"
                            >
                              <MapPin className="w-4 h-4 text-blue-600" />
                              Google Maps
                            </button>
                            <button
                              onClick={() => openWaze(facility)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cyan-50 transition-colors text-left text-gray-700 hover:text-cyan-600 font-medium border-t border-gray-100"
                            >
                              <Navigation className="w-4 h-4 text-cyan-600" />
                              Waze
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {expandedFacilityId === facility.id && (
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-t-2 border-blue-100 p-6 animate-fade-in">
                    <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                      Available Doctors at {facility.name}
                    </h4>

                    {doctorsLoading ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                        <p>Loading doctors...</p>
                      </div>
                    ) : (facilityDoctors ?? []).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(facilityDoctors ?? []).map((doctor, idx) => (
                          <div
                            key={doctor.userId}
                            className="card-hover bg-white rounded-xl p-4 shadow-md border border-gray-100 animate-fade-in-up"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <div className="relative">
                                <img
                                  src={DEFAULT_DOCTOR_IMAGE}
                                  alt={doctor.fullName}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-100"
                                />
                                {doctor.isAvailable && (
                                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-gray-900 mb-1">{doctor.fullName}</h5>
                                <p className="text-sm text-blue-600 font-medium">
                                  {doctor.specialty ?? 'General Medicine'}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {doctor.activeAvailabilityCount > 0
                                    ? `${doctor.activeAvailabilityCount} bookable slots`
                                    : 'Schedule on request'}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 mb-3">
                              {doctor.roomNumber ? (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span>Room {doctor.roomNumber}</span>
                                </div>
                              ) : null}
                              {doctor.consultationHours ? (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span>{doctor.consultationHours}</span>
                                </div>
                              ) : null}
                              {doctor.consultationDays.length > 0 ? (
                                <div className="flex items-start gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <div className="flex flex-wrap gap-1">
                                    {doctor.consultationDays.map((day, dayIdx) => (
                                      <span
                                        key={dayIdx}
                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium"
                                      >
                                        {day}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/patient/appointments/book?doctor=${encodeURIComponent(doctor.userId)}`
                                )
                              }
                              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-lg transition-all text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                            >
                              Book with {doctor.fullName}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-sm text-gray-600 py-6">
                        No bookable doctors are listed for this facility yet.{' '}
                        <button
                          type="button"
                          onClick={() => navigate('/find-doctor')}
                          className="font-semibold text-blue-600 underline"
                        >
                          Browse all doctors
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {filteredFacilities.length === 0 && (
              <div className="text-center py-16 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-pulse" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No facilities found</h3>
                <p className="text-gray-600">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-3000 {
          animation-delay: 3s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(-10px) translateX(-10px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes draw-line {
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-draw-line {
          animation: draw-line 4s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};
