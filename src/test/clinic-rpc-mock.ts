import type { Mock } from 'vitest';

export interface PatientFixture {
  user_id: string;
  full_name: string | null;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
}

/**
 * QA-208: the clinic pages read patients through clinic_patient_profiles / clinic_search_patients.
 * This answers those two functions from the test's current patient list; every other database
 * function returns the test's current result (a value, or a promise the test resolves itself).
 */
export const installClinicRpc = (
  rpc: Mock,
  getPatients: () => PatientFixture[],
  getResult: () => unknown
) => {
  rpc.mockImplementation((name: string, args: Record<string, unknown> = {}) => {
    if (name === 'clinic_patient_profiles') {
      const ids = (args.p_patient_ids as string[]) ?? [];
      return Promise.resolve({ data: getPatients().filter((p) => ids.includes(p.user_id)), error: null });
    }
    if (name === 'clinic_search_patients') {
      const query = String(args.p_query ?? '').toLowerCase();
      return Promise.resolve({
        data: getPatients().filter((p) => (p.full_name ?? '').toLowerCase().includes(query)),
        error: null,
      });
    }
    const result = getResult();
    return result instanceof Promise ? result : Promise.resolve(result);
  });
};
