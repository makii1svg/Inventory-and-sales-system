/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2457D6',
        canvas: '#F2F5FA',
        surface: '#FFFFFF',
        border: '#E1E6EF',
        ink: '#101828',
        muted: '#5B6779',
        navy: '#0E1A33',
      },
      boxShadow: {
        soft: '0 10px 24px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}

