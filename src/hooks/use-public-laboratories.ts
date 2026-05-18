import { supabase } from '../lib/supabase';
import type { PublicLaboratory } from '../types/facility';
import { useQuery } from './use-query';

interface PublicLaboratoryRpcRow {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  location: string;
  phone: string | null;
  email: string | null;
  opening_hours: string;
  rating: number | string | null;
  tests_available: number | null;
  services: string[] | null;
  featured: boolean;
}

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
};

const toNumber = (value: number | string | null | undefined, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function usePublicLaboratories() {
  return useQuery<PublicLaboratory[]>(async () => {
    const { data, error } = await supabase.rpc('get_public_laboratories');
    if (error) throw error;

    return ((data ?? []) as PublicLaboratoryRpcRow[]).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      city: row.city,
      location: row.location,
      phone: row.phone,
      email: row.email,
      openingHours: row.opening_hours,
      rating: toNumber(row.rating, 4.5),
      testsAvailable: row.tests_available ?? 0,
      services: parseStringArray(row.services),
      featured: row.featured,
    }));
  }, []);
}
