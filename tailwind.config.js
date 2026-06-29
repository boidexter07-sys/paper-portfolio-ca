/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F1419',
        graphite: '#3A424C',
        stone: '#6E7681',
        mist: '#C7CCD3',
        fog: '#E8EAED',
        paper: '#F7F7F4',
        bone: '#FFFFFF',
        mark: '#7A5230',
        positive: '#2E6B4F',
        negative: '#8B2C2C',
        warn: '#A86A1F',
        info: '#2C4F7A',
      },
      fontFamily: {
        serif: [
          '"Source Serif 4"',
          '"Source Serif Pro"',
          'Charter',
          '"Iowan Old Style"',
          'Georgia',
          'serif',
        ],
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        display: ['3rem', { lineHeight: '1.10' }],
        h1: ['2.25rem', { lineHeight: '1.15' }],
        h2: ['1.75rem', { lineHeight: '1.20' }],
        h3: ['1.375rem', { lineHeight: '1.25' }],
        h4: ['1.125rem', { lineHeight: '1.30' }],
        body: ['1rem', { lineHeight: '1.55' }],
        'body-sm': ['0.875rem', { lineHeight: '1.50' }],
        caption: ['0.8125rem', { lineHeight: '1.45' }],
        micro: ['0.75rem', { lineHeight: '1.40' }],
      },
      maxWidth: {
        prose: '64ch',
        readable: '36rem',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 20, 25, 0.04), 0 1px 3px rgba(15, 20, 25, 0.05)',
        modal: '0 10px 25px rgba(15, 20, 25, 0.12), 0 4px 10px rgba(15, 20, 25, 0.08)',
      },
    },
  },
  plugins: [],
};
