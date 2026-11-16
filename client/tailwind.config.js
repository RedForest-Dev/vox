/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#070A0F',
          900: '#0B0F17',
          800: '#111827',
          700: '#1F2937',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ghostFall: {
          '0%': { opacity: '0.9', transform: 'translateY(-14px)' },
          '100%': { opacity: '0.45', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out both',
        'ghost-fall': 'ghostFall 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};
