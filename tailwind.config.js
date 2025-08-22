/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#0D1117',
        surface: '#161B22',
        primary: '#2F81F7',
        secondary: '#FF7F0E',
        'text-primary': '#C9D1D9',
        'text-secondary': '#8B949E',
        danger: '#F85149',
      },
      fontFamily: {
        sans: ['Satoshi', 'sans-serif'],
      },
    },
  },
  plugins: [],
}