// Brand + neutral scales mirrored from the web portal's Tailwind usage
// (teal/slate palette and the `ceenai.*` brand colors in
// `tailwind.config.js`). Semantic themes below are the only colors screens use.

export const palette = {
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  ceenai: {
    cyan: '#00D4D4',
    cyanDark: '#00B8B8',
    blue: '#0099CC',
    blueDark: '#007799',
    navy: '#1E3A8A',
  },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669', 700: '#047857' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' },
  white: '#ffffff',
  black: '#000000',
} as const;

export type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'ai' | 'neutral';

export interface ToneColors {
  bg: string;
  fg: string;
  border: string;
}

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  primaryText: string;
  primarySoft: string;
  accent: string;
  skeleton: string;
  overlay: string;
  tabBar: string;
  tones: Record<Tone, ToneColors>;
}

export const lightColors: ThemeColors = {
  background: palette.slate[50],
  surface: palette.white,
  surfaceMuted: palette.slate[100],
  surfaceRaised: palette.white,
  border: palette.slate[200],
  borderStrong: palette.slate[300],
  text: palette.slate[900],
  textMuted: palette.slate[600],
  textSubtle: palette.slate[400],
  textInverse: palette.white,
  primary: palette.teal[600],
  primaryPressed: palette.teal[700],
  primaryText: palette.white,
  primarySoft: palette.teal[50],
  accent: palette.ceenai.blue,
  skeleton: palette.slate[200],
  overlay: 'rgba(15, 23, 42, 0.45)',
  tabBar: palette.white,
  tones: {
    brand: { bg: palette.teal[50], fg: palette.teal[700], border: palette.teal[100] },
    success: { bg: palette.emerald[50], fg: palette.emerald[700], border: palette.emerald[100] },
    warning: { bg: palette.amber[50], fg: palette.amber[700], border: palette.amber[100] },
    danger: { bg: palette.rose[50], fg: palette.rose[700], border: palette.rose[100] },
    info: { bg: palette.blue[50], fg: palette.blue[700], border: palette.blue[100] },
    ai: { bg: palette.violet[50], fg: palette.violet[700], border: palette.violet[100] },
    neutral: { bg: palette.slate[100], fg: palette.slate[600], border: palette.slate[200] },
  },
};

export const darkColors: ThemeColors = {
  background: palette.slate[950],
  surface: palette.slate[900],
  surfaceMuted: palette.slate[800],
  surfaceRaised: palette.slate[800],
  border: palette.slate[800],
  borderStrong: palette.slate[700],
  text: palette.slate[50],
  textMuted: palette.slate[300],
  textSubtle: palette.slate[500],
  textInverse: palette.slate[900],
  primary: palette.teal[500],
  primaryPressed: palette.teal[400],
  primaryText: palette.slate[950],
  primarySoft: 'rgba(20, 184, 166, 0.14)',
  accent: palette.ceenai.cyan,
  skeleton: palette.slate[800],
  overlay: 'rgba(2, 6, 23, 0.7)',
  tabBar: palette.slate[900],
  tones: {
    brand: { bg: 'rgba(20, 184, 166, 0.14)', fg: palette.teal[300], border: 'rgba(20, 184, 166, 0.3)' },
    success: { bg: 'rgba(16, 185, 129, 0.14)', fg: '#6ee7b7', border: 'rgba(16, 185, 129, 0.3)' },
    warning: { bg: 'rgba(245, 158, 11, 0.14)', fg: '#fcd34d', border: 'rgba(245, 158, 11, 0.3)' },
    danger: { bg: 'rgba(244, 63, 94, 0.14)', fg: '#fda4af', border: 'rgba(244, 63, 94, 0.3)' },
    info: { bg: 'rgba(59, 130, 246, 0.14)', fg: '#93c5fd', border: 'rgba(59, 130, 246, 0.3)' },
    ai: { bg: 'rgba(139, 92, 246, 0.16)', fg: '#c4b5fd', border: 'rgba(139, 92, 246, 0.3)' },
    neutral: { bg: palette.slate[800], fg: palette.slate[300], border: palette.slate[700] },
  },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
} as const;

export type TypographyVariant = keyof typeof typography;
