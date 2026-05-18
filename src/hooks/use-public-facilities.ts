import { supabase } from '../lib/supabase';
import type { FacilityType, PublicFacility } from '../types/facility';
import { useQuery } from './use-query';

interface PublicFacilityRpcRow {
  id: string;
  name: string;
  facility_type: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  image_url: string | null;
  description: string | null;
  rating: number | string | null;
  total_reviews: number | null;
  specialties: string[] | null;
  amenities: string[] | null;
  emergency_services: boolean;
  parking_available: boolean;
  insurance_accepted: string[] | null;
  operating_hours: Record<string, string> | null;
  latitude: number | string | null;
  longitude: number | string | null;
}

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
};

const parseFacilityType = (value: string): FacilityType => {
  if (value === 'hospital' || value === 'clinic' || value === 'pharmacy' || value === 'laboratory') {
    return value;
  }
  return 'clinic';
};

const toNumber = (value: number | string | null | undefined, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function usePublicFacilities() {
  return useQuery<PublicFacility[]>(async () => {
    const { data, error } = await supabase.rpc('get_public_facilities');
    if (error) throw error;

    return ((data ?? []) as PublicFacilityRpcRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      facilityType: parseFacilityType(row.facility_type),
      address: row.address,
      city: row.city,
      phone: row.phone,
      email: row.email,
      imageUrl: row.image_url,
      description: row.description,
      rating: toNumber(row.rating),
      totalReviews: row.total_reviews ?? 0,
      specialties: parseStringArray(row.specialties),
      amenities: parseStringArray(row.amenities),
      emergencyServices: row.emergency_services,
      parkingAvailable: row.parking_available,
      insuranceAccepted: parseStringArray(row.insurance_accepted),
      operatingHours: row.operating_hours ?? {},
      latitude: row.latitude === null ? null : toNumber(row.latitude, NaN) || null,
      longitude: row.longitude === null ? null : toNumber(row.longitude, NaN) || null,
    }));
  }, []);
}
