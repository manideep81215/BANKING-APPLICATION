/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0a0e1a', mid: '#111827', light: '#1a2236' },
        gold: { DEFAULT: '#c9a84c', light: '#e8c97a', dim: 'rgba(201,168,76,0.15)' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
    },
  },
  plugins: [],
}
