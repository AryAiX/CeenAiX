import { SUPABASE_ANON_KEY, edgeFunctionUrl } from './supabase';

export const MARKETING_LAUNCH_DATE = new Date('2026-08-01T09:00:00+04:00');
export const MARKETING_LEADS_COUNTER_FLOOR = 25;

const leadsUrl = (path: string) => edgeFunctionUrl(`leads${path}`);

const apiHeaders = () => ({
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
});

export interface LaunchNotifyPayload {
  name: string;
  email: string;
  preferred_language: string;
  consent: boolean;
  persona?: string;
  marketing_opt_in?: boolean;
  website?: string;
}

export interface DemoRequestPayload {
  full_name: string;
  email: string;
  phone: string;
  organization_name: string;
  role: string;
  organization_type: string;
  country: string;
  team_size: string;
  interests: string[];
  preferred_demo_time?: string;
  specific_date?: string;
  notes?: string;
  preferred_language: string;
  consent: boolean;
  marketing_opt_in?: boolean;
  override_free_email?: boolean;
  website?: string;
}

export type LeadsApiErrors = Partial<Record<string, string>> & { _global?: string };

export interface LeadsApiResult {
  success: boolean;
  errors?: LeadsApiErrors;
}

export async function submitLaunchNotify(payload: LaunchNotifyPayload): Promise<LeadsApiResult> {
  const response = await fetch(leadsUrl('/launch-notify'), {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(payload),
  });
  return (await response.json()) as LeadsApiResult;
}

export async function submitDemoRequest(payload: DemoRequestPayload): Promise<LeadsApiResult> {
  const response = await fetch(leadsUrl('/demo-request'), {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(payload),
  });
  return (await response.json()) as LeadsApiResult;
}

export async function fetchLaunchLeadCount(): Promise<{ visible: boolean; count: number }> {
  try {
    const response = await fetch(leadsUrl('/count'), {
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const data = (await response.json()) as { visible?: boolean; count?: number };
    return {
      visible: Boolean(data.visible),
      count: typeof data.count === 'number' ? data.count : 0,
    };
  } catch {
    return { visible: false, count: 0 };
  }
}

export function getMarketingLaunchTimeLeft(target: Date = MARKETING_LAUNCH_DATE) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    done: diff === 0,
  };
}
