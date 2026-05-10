import i18n from 'i18next';
import type { LabOrder, LabOrderItem } from '../types';
import {
  hydrateLabOrderItemsWithCatalog,
  loadLabTestCatalogRowsForLabOrderItems,
  loadLabTestCatalogSuggestionRowsForLabOrderItems,
} from '../lib/lab-test-catalog';
import { useQuery } from './use-query';
import { supabase } from '../lib/supabase';

const patientFallback = () => i18n.t('shared.patient', { defaultValue: 'Patient' });

export interface DoctorLabOrderRecord extends LabOrder {
  patientName: string;
  patientEmail: string | null;
  items: LabOrderItem[];
}

export function useDoctorLabOrders(userId: string | null | undefined) {
  return useQuery<DoctorLabOrderRecord[]>(async () => {
    if (!userId) {
      return [];
    }

    const { data: labOrders, error: labOrdersError } = await supabase
      .from('lab_orders')
      .select('*')
      .eq('doctor_id', userId)
      .eq('is_deleted', false)
      .order('ordered_at', { ascending: false });

    if (labOrdersError) {
      throw labOrdersError;
    }

    const safeLabOrders = (labOrders ?? []) as LabOrder[];

    if (safeLabOrders.length === 0) {
      return [];
    }

    const labOrderIds = safeLabOrders.map((labOrder) => labOrder.id);
    const patientIds = Array.from(new Set(safeLabOrders.map((labOrder) => labOrder.patient_id)));

    const [
      { data: labOrderItems, error: labOrderItemsError },
      { data: patientProfiles, error: patientProfilesError },
    ] = await Promise.all([
      supabase
        .from('lab_order_items')
        .select('*')
        .in('lab_order_id', labOrderIds)
        .order('created_at', { ascending: true }),
      supabase.from('user_profiles').select('user_id, full_name, email').in('user_id', patientIds),
    ]);

    if (labOrderItemsError) {
      throw labOrderItemsError;
    }

    if (patientProfilesError) {
      throw patientProfilesError;
    }

    const hydratedLabOrderItems = hydrateLabOrderItemsWithCatalog(
      (labOrderItems ?? []) as LabOrderItem[],
      await loadLabTestCatalogRowsForLabOrderItems((labOrderItems ?? []) as LabOrderItem[]),
      await loadLabTestCatalogSuggestionRowsForLabOrderItems((labOrderItems ?? []) as LabOrderItem[])
    );

    const patientProfileById = new Map(
      (patientProfiles ?? []).map((profile) => [
        profile.user_id,
        {
          name: profile.full_name ?? patientFallback(),
          email: profile.email ?? null,
        },
      ])
    );

    const itemsByLabOrderId = new Map<string, LabOrderItem[]>();
    for (const item of hydratedLabOrderItems) {
      const existingItems = itemsByLabOrderId.get(item.lab_order_id) ?? [];
      existingItems.push(item);
      itemsByLabOrderId.set(item.lab_order_id, existingItems);
    }

    return safeLabOrders.map((labOrder) => {
      const patientProfile = patientProfileById.get(labOrder.patient_id);

      return {
        ...labOrder,
        patientName: patientProfile?.name ?? patientFallback(),
        patientEmail: patientProfile?.email ?? null,
        items: itemsByLabOrderId.get(labOrder.id) ?? [],
      };
    });
  }, [userId ?? '']);
}
