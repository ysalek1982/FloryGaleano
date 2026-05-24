/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#faf7f0',
          100: '#f3eadb',
          200: '#e6d3b8',
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
          100: '#fff2cc',
          500: '#d8941f',
          600: '#b87916',
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
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 18px 50px rgba(41, 33, 22, 0.08)',
        panel: '0 10px 28px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}
