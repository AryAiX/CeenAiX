import { useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';
import type { LabOrderStatus } from '../types';

export interface LabWorklistItem {
  id: string;
  patientId: string;
  patientName: string | null;
  doctorId: string;
  doctorName: string | null;
  status: LabOrderStatus;
  orderedAt: string;
  assignedLabId: string | null;
  testCount: number;
  resultedTestCount: number;
  pendingTestCount: number;
  firstTestName: string | null;
}

export interface LabDashboardData {
  labId: string | null;
  labName: string | null;
  labSlug: string | null;
  metrics: {
    pendingOrders: number;
    inProgressOrders: number;
    collectedOrders: number;
    completedToday: number;
    totalActiveTests: number;
    stat: number;
  };
  worklist: LabWorklistItem[];
}

const ACTIVE_STATUSES: LabOrderStatus[] = ['ordered', 'collected', 'processing', 'resulted'];

const startOfLocalDayIso = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
};

export function useLabDashboard(userId: string | null | undefined) {
  const memoizedUserId = userId ?? null;

  return useQuery<LabDashboardData | null>(async () => {
    if (!memoizedUserId) {
      return null;
    }

    const { data: staffRows, error: staffError } = await supabase
      .from('lab_staff')
      .select('id, lab_id, is_active')
      .eq('user_id', memoizedUserId)
      .eq('is_active', true)
      .limit(1);

    if (staffError) {
      throw staffError;
    }

    const labId = staffRows?.[0]?.lab_id ?? null;

    let labName: string | null = null;
    let labSlug: string | null = null;
    if (labId) {
      const { data: labRow, error: labError } = await supabase
        .from('lab_profiles')
        .select('name, slug')
        .eq('id', labId)
        .maybeSingle();
      if (labError) {
        throw labError;
      }
      labName = labRow?.name ?? null;
      labSlug = labRow?.slug ?? null;
    }

    let ordersQuery = supabase
      .from('lab_orders')
      .select('id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, updated_at')
      .eq('is_deleted', false)
      .in('status', ACTIVE_STATUSES)
      .order('ordered_at', { ascending: false })
      .limit(100);

    if (labId) {
      ordersQuery = ordersQuery.eq('assigned_lab_id', labId);
    }

    const { data: orderRows, error: ordersError } = await ordersQuery;
    if (ordersError) {
      throw ordersError;
    }

    const orders = orderRows ?? [];
    const orderIds = orders.map((order) => order.id);

    let itemRows: Array<{
      lab_order_id: string;
      test_name: string;
      status: LabOrderStatus;
      resulted_at: string | null;
    }> = [];

    if (orderIds.length > 0) {
      const { data, error } = await supabase
        .from('lab_order_items')
        .select('lab_order_id, test_name, status, resulted_at')
        .in('lab_order_id', orderIds)
        .order('created_at', { ascending: true });
      if (error) {
        throw error;
      }
      itemRows = data ?? [];
    }

    const participantIds = Array.from(
      new Set(orders.flatMap((order) => [order.patient_id, order.doctor_id]))
    );

    const profilesById = new Map<string, string>();
    if (participantIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', participantIds);
      if (profilesError) {
        throw profilesError;
      }
      (profiles ?? []).forEach((profile) => {
        profilesById.set(profile.user_id, profile.full_name ?? '—');
      });
    }

    const itemsByOrder = new Map<string, typeof itemRows>();
    itemRows.forEach((item) => {
      const list = itemsByOrder.get(item.lab_order_id) ?? [];
      list.push(item);
      itemsByOrder.set(item.lab_order_id, list);
    });

    const worklist: LabWorklistItem[] = orders.map((order) => {
      const items = itemsByOrder.get(order.id) ?? [];
      const resultedTests = items.filter((item) => item.status === 'resulted').length;
      const pendingTests = items.filter((item) => item.status !== 'resulted' && item.status !== 'reviewed').length;
      return {
        id: order.id,
        patientId: order.patient_id,
        patientName: profilesById.get(order.patient_id) ?? null,
        doctorId: order.doctor_id,
        doctorName: profilesById.get(order.doctor_id) ?? null,
        status: order.status,
        orderedAt: order.ordered_at,
        assignedLabId: order.assigned_lab_id,
        testCount: items.length,
        resultedTestCount: resultedTests,
        pendingTestCount: pendingTests,
        firstTestName: items[0]?.test_name ?? null,
      };
    });

    const startOfToday = startOfLocalDayIso();
    const metrics = {
      pendingOrders: worklist.filter((order) => order.status === 'ordered').length,
      inProgressOrders: worklist.filter((order) => order.status === 'processing').length,
      collectedOrders: worklist.filter((order) => order.status === 'collected').length,
      completedToday: worklist.filter(
        (order) => order.status === 'resulted' && order.orderedAt >= startOfToday
      ).length,
      totalActiveTests: worklist.reduce((sum, order) => sum + order.testCount, 0),
      stat: 0,
    };

    return {
      labId,
      labName,
      labSlug,
      metrics,
      worklist,
    };
  }, [memoizedUserId]);
}

export interface LabOrderActions {
  claim: (orderId: string) => Promise<void>;
  startProcessing: (orderId: string) => Promise<void>;
  saveItemResult: (input: {
    itemId: string;
    resultValue: string;
    resultUnit: string | null;
    referenceRange: string | null;
    isAbnormal: boolean;
  }) => Promise<void>;
  releaseOrder: (orderId: string) => Promise<void>;
}

export function useLabOrderActions(onChange: () => void): LabOrderActions {
  const claim = useCallback(
    async (orderId: string) => {
      const { error } = await supabase.rpc('lab_claim_order', { target_order_id: orderId });
      if (error) {
        throw error;
      }
      onChange();
    },
    [onChange]
  );

  const startProcessing = useCallback(
    async (orderId: string) => {
      const { error } = await supabase.rpc('lab_start_processing', { target_order_id: orderId });
      if (error) {
        throw error;
      }
      onChange();
    },
    [onChange]
  );

  const saveItemResult = useCallback(
    async ({ itemId, resultValue, resultUnit, referenceRange, isAbnormal }: {
      itemId: string;
      resultValue: string;
      resultUnit: string | null;
      referenceRange: string | null;
      isAbnormal: boolean;
    }) => {
      const { error } = await supabase.rpc('lab_save_item_result', {
        target_item_id: itemId,
        result_value: resultValue,
        result_unit: resultUnit,
        reference_range: referenceRange,
        is_abnormal: isAbnormal,
      });
      if (error) {
        throw error;
      }
      onChange();
    },
    [onChange]
  );

  const releaseOrder = useCallback(
    async (orderId: string) => {
      const { error } = await supabase.rpc('lab_release_order', { target_order_id: orderId });
      if (error) {
        throw error;
      }
      onChange();
    },
    [onChange]
  );

  return useMemo(
    () => ({ claim, startProcessing, saveItemResult, releaseOrder }),
    [claim, startProcessing, saveItemResult, releaseOrder]
  );
}

export interface LabOrderDetail {
  id: string;
  status: LabOrderStatus;
  orderedAt: string;
  patientId: string;
  patientName: string | null;
  doctorName: string | null;
  assignedLabId: string | null;
  items: Array<{
    id: string;
    testName: string;
    testCode: string | null;
    status: LabOrderStatus;
    resultValue: string | null;
    resultUnit: string | null;
    referenceRange: string | null;
    isAbnormal: boolean | null;
    resultedAt: string | null;
  }>;
}

export function useLabOrderDetail(orderId: string | null | undefined) {
  return useQuery<LabOrderDetail | null>(async () => {
    if (!orderId) {
      return null;
    }
    const { data: order, error: orderError } = await supabase
      .from('lab_orders')
      .select('id, status, ordered_at, patient_id, doctor_id, assigned_lab_id')
      .eq('id', orderId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (orderError) {
      throw orderError;
    }
    if (!order) {
      return null;
    }
    const { data: items, error: itemsError } = await supabase
      .from('lab_order_items')
      .select('id, test_name, test_code, status, result_value, result_unit, reference_range, is_abnormal, resulted_at')
      .eq('lab_order_id', order.id)
      .order('created_at', { ascending: true });
    if (itemsError) {
      throw itemsError;
    }
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, full_name')
      .in('user_id', [order.patient_id, order.doctor_id]);
    if (profilesError) {
      throw profilesError;
    }
    const profilesById = new Map<string, string>();
    (profiles ?? []).forEach((profile) => {
      profilesById.set(profile.user_id, profile.full_name ?? '—');
    });
    return {
      id: order.id,
      status: order.status,
      orderedAt: order.ordered_at,
      patientId: order.patient_id,
      patientName: profilesById.get(order.patient_id) ?? null,
      doctorName: profilesById.get(order.doctor_id) ?? null,
      assignedLabId: order.assigned_lab_id,
      items: (items ?? []).map((item) => ({
        id: item.id,
        testName: item.test_name,
        testCode: item.test_code,
        status: item.status,
        resultValue: item.result_value,
        resultUnit: item.result_unit,
        referenceRange: item.reference_range,
        isAbnormal: item.is_abnormal,
        resultedAt: item.resulted_at,
      })),
    };
  }, [orderId ?? '']);
}
