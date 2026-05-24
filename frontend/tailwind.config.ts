import animate from 'tailwindcss-animate';
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta da Escola do Breno — extraída do site oficial. Ver design.md.
        brand: {
          orange: '#FF5917',
          'orange-hover': '#E84E10',
          lime: '#DDFD5A',
          deep: '#0E2E23',
        },
        neutral: {
          50:  '#FAFAF7',
          100: '#F1F1ED',
          200: '#E5E5DF',
          300: '#D4D4CE',
          400: '#A8A8A2',
          500: '#7A7A75',
          600: '#5C5C58',
          700: '#3D3D3A',
          800: '#1F1F1D',
          900: '#0E2E23',
        },
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        md: '6px',
        lg: '10px',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
