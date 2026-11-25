import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isBookableClinicDoctor } from '../lib/clinic-booking';
import { searchClinicPatients } from '../lib/clinic-patients';

/**
 * QA-218: people a clinic can start a conversation with from Messages. The database
 * (get_or_create_direct_conversation, QA-073) allows exactly these:
 *   * the clinic's doctors (accepted / active link), listed straight away;
 *   * patients with a visit at the clinic, found by name or phone through clinic_search_patients
 *     (QA-208: at least 2 characters, at most 8 matches).
 */
export interface ClinicMessageContact {
  id: string;
  name: string;
}

interface State<T> {
  data: T;
  loading: boolean;
  error: boolean;
}

/** The clinic's doctors. Loads only while `userId` is set (the picker is open). */
export function useClinicMessageDoctors(userId: string | null | undefined): State<ClinicMessageContact[]> {
  const [state, setState] = useState<State<ClinicMessageContact[]>>({ data: [], loading: false, error: false });

  useEffect(() => {
    if (!userId) {
      setState({ data: [], loading: false, error: false });
      return;
    }
    let cancelled = false;
    setState({ data: [], loading: true, error: false });

    void (async () => {
      try {
        const { data: member, error: memberError } = await supabase
          .from('clinic_portal_members')
          .select('facility_id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();
        if (memberError) throw memberError;
        if (!member?.facility_id) throw new Error('No clinic found');

        const { data: links, error: linksError } = await supabase
          .from('facility_staff')
          .select('doctor_user_id, is_active, invitation_status')
          .eq('facility_id', member.facility_id);
        if (linksError) throw linksError;

        const doctorIds = Array.from(
          new Set(
            ((links ?? []) as { doctor_user_id: string | null; is_active: boolean | null; invitation_status: string | null }[])
              .filter((link) => link.doctor_user_id && isBookableClinicDoctor(link))
              .map((link) => link.doctor_user_id as string)
          )
        );

        let doctors: ClinicMessageContact[] = [];
        if (doctorIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', doctorIds);
          if (profilesError) throw profilesError;
          const names = new Map(
            ((profiles ?? []) as { user_id: string; full_name: string | null }[]).map((p) => [p.user_id, p.full_name])
          );
          doctors = doctorIds
            .map((id) => ({ id, name: names.get(id)?.trim() || '' }))
            .filter((doctor) => doctor.name)
            .sort((a, b) => a.name.localeCompare(b.name));
        }

        if (!cancelled) setState({ data: doctors, loading: false, error: false });
      } catch (error) {
        console.warn('[ClinicMessageContacts] doctors failed', error);
        if (!cancelled) setState({ data: [], loading: false, error: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}

export const MIN_PATIENT_SEARCH_LENGTH = 2;

/** Patients with a visit at the clinic matching `query` (nothing below 2 characters). */
export function useClinicMessagePatients(query: string): State<ClinicMessageContact[]> {
  const [state, setState] = useState<State<ClinicMessageContact[]>>({ data: [], loading: false, error: false });
  const text = query.trim();

  useEffect(() => {
    if (text.length < MIN_PATIENT_SEARCH_LENGTH) {
      setState({ data: [], loading: false, error: false });
      return;
    }
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: false }));
    // wait for a pause in typing, and ignore answers to older searches
    const timer = setTimeout(() => {
      searchClinicPatients(supabase, text)
        .then((rows) => {
          if (cancelled) return;
          setState({
            data: rows
              .filter((row) => row.full_name?.trim())
              .map((row) => ({ id: row.user_id, name: (row.full_name as string).trim() })),
            loading: false,
            error: false,
          });
        })
        .catch((error: unknown) => {
          console.warn('[ClinicMessageContacts] patient search failed', error);
          if (!cancelled) setState({ data: [], loading: false, error: true });
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text]);

  return state;
}
