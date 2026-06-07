/** @type {import('tailwindcss').Config} */
// Brand tokens mirror the web app (`../tailwind.config.js` + the teal/slate
// palette used across `src/pages/patient/*`) so mobile keeps visual parity.
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary brand teal (web uses teal-600 #0D9488 as the accent).
        brand: {
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
        // CeenAiX cyan accent (web `ceenai-cyan`).
        ceenai: {
          cyan: '#22d3ee',
        },
      },
    },
  },
  plugins: [],
};
