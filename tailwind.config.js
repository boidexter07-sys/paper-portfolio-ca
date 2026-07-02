/** @type {import('tailwindcss').Config} */
// Altier Edge — D2 Architectural Grid design tokens.
// Locked from docs/t62/direction-02-tokens.json.
// Brutalist: ink on bone, JetBrains Mono + Inter, 2px ink borders,
// orange #FF3B00 reserved for signal only.
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // D2 token map
        ink: '#0A0A0A',
        graphite: '#2A2A2A',
        stone: '#555550',
        quaternary: '#8A8880',
        fog: '#D5D3CC',
        rule: 'rgba(10,10,10,0.04)',
        paper: '#FAFAF7',
        panel: '#F2F2EE',
        elevated: '#ECECE7',
        bone: '#FFFFFF',
        // Brand signals
        signal: '#FF3B00',         // D2 brand accent (orange)
        signal_alt: '#0046FF',
        // Inverse
        inverse: '#1A1A1A',
        inverse_fg: '#E5E5E0',
        // Backwards-compat aliases — keeps older component class names
        // (text-ink, bg-paper, etc.) wired to D2 tokens.
        mark: '#FF3B00',
        positive: '#2E6B4F',
        negative: '#8B2C2C',
        warn: '#A86A1F',
        info: '#2C4F7A',
        mist: '#C0BEB6',
      },
      fontFamily: {
        // Display + code: JetBrains Mono. Body: Inter.
        mono: [
          '"JetBrains Mono"',
          '"JetBrains Mono Medium"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
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
        // Aliases for old components
        serif: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      fontSize: {
        display: ['64px', { lineHeight: '1.08', letterSpacing: '-0.03em' }],
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
        // D2: no rounded corners.
        sm: '0px',
        md: '0px',
        lg: '0px',
      },
      boxShadow: {
        // D2: brutalist offset shadow.
        brutal: '4px 4px 0 #0A0A0A',
        brutal_sm: '2px 2px 0 #0A0A0A',
        card: '0 1px 0 #D5D3CC',
        modal: '4px 4px 0 #0A0A0A',
      },
    },
  },
  plugins: [],
};