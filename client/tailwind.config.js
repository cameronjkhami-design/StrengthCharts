/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #FFD700)',
        dark: {
          900: 'var(--dark-900, #0a0a0a)',
          800: 'var(--dark-800, #141414)',
          700: 'var(--dark-700, #1e1e1e)',
          600: 'var(--dark-600, #2a2a2a)',
          500: 'var(--dark-500, #3a3a3a)',
        }
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
