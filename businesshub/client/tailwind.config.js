/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "brand" = deep, confident emerald. Money, growth, trust — not
        // the generic indigo-600 every SaaS template defaults to.
        brand: {
          50: '#eef7f1',
          100: '#d7ecdf',
          200: '#b0d9c0',
          300: '#7fbf9b',
          400: '#4f9e76',
          500: '#2f7e59',
          600: '#1f6647',
          700: '#1a5239',
          800: '#16412e',
          900: '#0f3d2e',
          950: '#0a2620',
        },
        // "gold" = warm marketplace accent, used sparingly — a highlight
        // color, never a base color. Evokes Naira/market energy without
        // reading as the generic terracotta AI-design tell.
        gold: {
          50: '#fdf6e9',
          100: '#faebc8',
          300: '#f0c470',
          400: '#e8a33d',
          500: '#d98a25',
          600: '#b56e1c',
        },
        // Warm-tinted neutrals instead of clinical Tailwind gray — every
        // "gray" in this app should route through here, not gray-*.
        ink: {
          50: '#faf8f4',
          100: '#f3f0e9',
          200: '#e6e1d6',
          300: '#d1cabb',
          400: '#a89f8c',
          500: '#7d7565',
          600: '#5b5548',
          700: '#413d34',
          800: '#2c2924',
          900: '#1c1a16',
          950: '#16211c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28, 26, 22, 0.04), 0 1px 1px rgba(28, 26, 22, 0.03)',
        'card-hover': '0 8px 24px -4px rgba(15, 61, 46, 0.12), 0 2px 6px rgba(28, 26, 22, 0.04)',
        'gold-glow': '0 8px 30px -6px rgba(232, 163, 61, 0.35)',
      },
    },
  },
  plugins: [],
};
