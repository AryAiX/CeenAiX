export interface SectionDef {
  id: string;
  label: string;
  group: string;
  dirty?: boolean;
}

export interface SettingCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  scope?: string;
  locked?: boolean;
}

export type Environment = 'production' | 'staging' | 'sandbox';
