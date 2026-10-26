/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#17191C',
          light: '#25292E',
          muted: '#363B42',
          surface: '#1E2125',
          dark: '#0F1012',
        },
        snow: {
          DEFAULT: '#F8F7F4',
          pure: '#FFFFFF',
          subtle: '#F0EFEA',
        },
        cream: {
          DEFAULT: '#EDE7DC',
          dark: '#D8D0C2',
          light: '#F5F1EA',
        },
        burgundy: {
          DEFAULT: '#762B3D',
          hover: '#612130',
          deep: '#4D1623',
          light: '#8F394C',
        },
        ice: {
          DEFAULT: '#C9DDE8',
          light: '#E2EEF5',
          muted: '#A5C4D4',
        },
        silver: {
          DEFAULT: '#A9ADB3',
          dark: '#7A7E85',
          light: '#CFD2D6',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Cinzel"', '"Cormorant Garamond"', 'serif'],
      },
      letterSpacing: {
        widest: '.2em',
        editorial: '.35em',
      },
      animation: {
        'marquee': 'marquee 30s linear infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
