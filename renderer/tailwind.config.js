/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './resources/**/*.blade.php',
    './resources/**/*.js',
    './resources/**/*.vue',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FFF9E6',
          100: '#FFF0BF',
          200: '#FFE699',
          300: '#FFD966',
          400: '#D4A843',
          500: '#C49A38',
          600: '#A37E2C',
          700: '#7D6022',
          800: '#574318',
          900: '#31260E',
        },
        charcoal: {
          50: '#E8E8EC',
          100: '#C5C5CE',
          200: '#9E9EAE',
          300: '#77778E',
          400: '#595975',
          500: '#3B3B5C',
          600: '#2A2A3C',
          700: '#1E1E2C',
          800: '#161620',
          900: '#0E0E14',
        },
      },
    },
  },
  plugins: [],
}
