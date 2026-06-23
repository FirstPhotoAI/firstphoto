/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#fafaf8',
          raised: '#f5f3ef',
          card: '#fafaf8',
          border: 'rgba(15,15,15,0.12)',
        },
        accent: {
          DEFAULT: '#0f0f0f',
          muted: 'rgba(15,15,15,0.42)',
        },
        ink: '#0f0f0f',
        paper: '#fafaf8',
        warm: '#f5f3ef',
        rule: 'rgba(15,15,15,0.12)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
