/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'base': '#0D1117',
        'surface': '#161B22',
        'primary': '#2F81F7',
        'primary-light': '#58A6FF',
        'secondary': '#FFC107',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8B949E',
        'danger': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Satoshi', 'sans-serif'],
      },
    },
  },
  plugins: [],
}