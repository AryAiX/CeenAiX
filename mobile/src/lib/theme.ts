// Typed brand tokens mirrored from the web app so non-NativeWind surfaces
// (React Navigation theme, status bar, charts) share the exact same palette
// as the Tailwind classes in `tailwind.config.js`.
export const colors = {
  brand: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    900: '#0f172a',
  },
  white: '#ffffff',
  rose: '#f43f5e',
  amber: '#f59e0b',
  emerald: '#10b981',
  blue: '#3b82f6',
  violet: '#8b5cf6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  md: 12,
  lg: 16,
  xl: 24,
} as const;
