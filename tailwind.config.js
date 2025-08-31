/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        card: '#161b22',
        border: '#30363d',
        primary: {
          DEFAULT: '#a855f7', // Violet/Magenta du logo
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#22d3ee', // Cyan/Bleu clair du logo
          foreground: '#0d1117',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
      }
    },
  },
  plugins: [],
}