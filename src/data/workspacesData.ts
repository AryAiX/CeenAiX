export type WorkspaceEnvironment = 'production' | 'staging' | 'sandbox' | 'partner';
export type WorkspaceRole = 'Super Admin' | 'Admin' | 'Viewer';

export interface Workspace {
  id: string;
  name: string;
  environment: WorkspaceEnvironment;
  role: WorkspaceRole;
  logoUrl?: string;
  brandColor: string;
  lastVisited?: string; // ISO date string
}

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: 'ws-prod',
    name: 'CeenAiX Production',
    environment: 'production',
    role: 'Super Admin',
    brandColor: '#0D9488',
    lastVisited: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'ws-staging',
    name: 'CeenAiX Staging',
    environment: 'staging',
    role: 'Super Admin',
    brandColor: '#0891B2',
    lastVisited: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'ws-sandbox',
    name: 'Developer Sandbox',
    environment: 'sandbox',
    role: 'Admin',
    brandColor: '#7C3AED',
    lastVisited: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'ws-partner-alnoor',
    name: 'Al Noor Medical Partner',
    environment: 'partner',
    role: 'Viewer',
    brandColor: '#D97706',
  },
  {
    id: 'ws-partner-emirates',
    name: 'Emirates Hospital Partner',
    environment: 'partner',
    role: 'Admin',
    brandColor: '#059669',
  },
];

export const ENV_COLORS: Record<WorkspaceEnvironment, string> = {
  production: '#10B981',
  staging: '#3B82F6',
  sandbox: '#8B5CF6',
  partner: '#F59E0B',
};

export const ACTIVE_WORKSPACE_ID = 'ws-prod';
