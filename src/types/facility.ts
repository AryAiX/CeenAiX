export type FacilityType = 'hospital' | 'clinic' | 'pharmacy' | 'laboratory';

export interface PublicFacility {
  id: string;
  name: string;
  facilityType: FacilityType;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  imageUrl: string | null;
  description: string | null;
  rating: number;
  totalReviews: number;
  specialties: string[];
  amenities: string[];
  emergencyServices: boolean;
  parkingAvailable: boolean;
  insuranceAccepted: string[];
  operatingHours: Record<string, string>;
  latitude: number | null;
  longitude: number | null;
}

export interface FacilityDoctor {
  userId: string;
  fullName: string;
  specialty: string | null;
  city: string | null;
  address: string | null;
  consultationFee: number | null;
  isAvailable: boolean;
  consultationDays: string[];
  consultationHours: string | null;
  roomNumber: string | null;
  activeAvailabilityCount: number;
}

export interface PublicLaboratory {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  location: string;
  phone: string | null;
  email: string | null;
  openingHours: string;
  rating: number;
  testsAvailable: number;
  services: string[];
  featured: boolean;
}
