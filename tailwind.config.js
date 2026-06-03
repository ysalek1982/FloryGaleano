/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fbf7ed',
          100: '#f2e7d3',
          200: '#dec6a2',
        },
        forest: {
          50: '#eff8f2',
          100: '#d8efe0',
          500: '#2f8a5b',
          600: '#247047',
          700: '#1d5a3b',
          900: '#123424',
        },
        saffron: {
          50: '#fff8df',
          100: '#fff2cc',
          500: '#d8941f',
          600: '#b87916',
        },
        copper: {
          50: '#fff4ed',
          100: '#ffe3d0',
          500: '#b75e28',
          700: '#7d3818',
        },
        danger: {
          50: '#fff1f2',
          100: '#ffe4e6',
          600: '#e11d48',
          700: '#be123c',
        },
        ai: {
          50: '#f5f3ff',
          100: '#ede9fe',
          600: '#7c3aed',
          700: '#6d28d9',
        },
      },
      fontFamily: {
        sans: ['Aptos', 'Avenir Next', 'Segoe UI Variable', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        soft: '0 22px 60px rgba(53, 42, 25, 0.12)',
        panel: '0 14px 34px rgba(30, 41, 59, 0.10)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.8)',
      },
    },
  },
  plugins: [],
}
