/** @type {import('tailwindcss').Config} */
// Altier Edge — TAILWIND TOKEN MAP ALIGNED TO D3 CINEMATIC DARK THEME.
//
// History: tailwind.config.js was originally written for the D2 brutalist
// light theme (ink #0A0A0A on bone #FFFFFF). The D3 cinematic motion
// rebrand (T70) flipped globals.css + AppShell to dark-first (--d3-void
// #0A1020 background, --d3-ink #F5F1E8 foreground) but the Tailwind color
// tokens were left at the D2 values. Result: 65 components using
// `text-ink` / `text-graphite` / `bg-bone` / `bg-paper` rendered black
// text on dark navy — invisible. (T100 visual audit confirmed.)
//
// Fix: remap every shared token to its D3 dark-theme equivalent. Brand
// signals (mark / signal / positive / negative / warn / info) stay
// unchanged — they're semantic across themes.
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // === D3 dark-theme token map ===
        // Foreground tokens — were D2 black/gray, now D3 cream/muted so
        // text-ink on var(--d3-void) reads as cream-on-navy.
        ink: '#F5F1E8',            // primary fg (was #0A0A0A black)
        graphite: '#9AA0B0',       // secondary fg (was #2A2A2A)
        stone: '#5A6070',          // tertiary fg (was #555550)
        quaternary: '#5A6070',
        // Background tokens — were D2 light surfaces, now D3 dark surfaces.
        paper: '#0A1020',          // primary bg = --d3-void (was #FAFAF7)
        panel: '#101A2E',          // elevated bg = --d3-card (was #F2F2EE)
        elevated: '#142035',       // raised bg = --d3-card-hover (was #ECECE7)
        bone: '#101A2E',           // card/panel bg = --d3-card (was #FFFFFF)
        // Hairline / border tokens — were D2 light gray, now D3 hairline.
        fog: 'rgba(245, 241, 232, 0.08)',  // hairline (was #D5D3CC)
        rule: 'rgba(245, 241, 232, 0.04)',
        mist: '#1A2238',           // chrome surface = --d3-card-chrome
        // Inverse (kept for any explicit light-on-dark badge work)
        inverse: '#F5F1E8',
        inverse_fg: '#0A1020',
        // === Brand signals (unchanged — semantic across themes) ===
        signal: '#FF3B00',         // brand accent (orange) — keep
        signal_alt: '#0046FF',
        mark: '#FF3B00',
        positive: '#2E6B4F',
        negative: '#8B2C2C',
        warn: '#A86A1F',
        info: '#2C4F7A',
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