/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2457D6',
        canvas: '#F2F5FA',
        surface: '#FFFFFF',
        border: '#E6EAF2',
        ink: '#101828',
        muted: '#5B6779',
        navy: '#0E1A33',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16, 24, 40, 0.04)',
      },
    },
  },
  plugins: [],
}

