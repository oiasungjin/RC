import type { Config } from 'tailwindcss';

// Apple design system — Action Blue accent, near-black ink, parchment surfaces,
// SF Pro / system-ui typography, pill grammar, single-shadow philosophy.
// Strategy: we remap Tailwind's slate / blue / emerald / rose scales to Apple's
// neutral + system colors so every existing `slate-*` / `blue-*` utility across
// the app instantly adopts the Apple palette without touching each page.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core brand
        ink: '#1d1d1f',          // Apple near-black — every headline & body on light
        inkMuted: '#6e6e73',     // Apple secondary text
        paper: '#ffffff',        // dominant white canvas
        parchment: '#f5f5f7',    // signature Apple off-white (sections, footer)
        pearl: '#fafafc',        // near-white ghost-button fill
        tile: '#1d1d1f',         // dark tile surface
        accent: '#0066cc',       // Action Blue — the single interactive color
        accentFocus: '#0071e3',  // focus-ring blue
        accentOnDark: '#2997ff', // Sky Link Blue for dark surfaces
        accentSoft: '#e8f1fc',   // light Action-Blue tint (chips, soft pills)
        hairline: '#d2d2d7',     // standard Apple hairline border
        divider: '#f0f0f0',      // soft divider tone

        // Functional emotion / status palette (unchanged — drives emotion tags)
        gold: '#B0894F',
        warn: '#F59E0B',
        risk: '#DC2626',
        pleasure: '#FB923C',
        joy: '#FCD34D',
        comfort: '#86EFAC',
        neutral: '#94A3B8',
        sad: '#60A5FA',
        fear: '#A78BFA',
        anger: '#F87171',

        // --- Remapped Tailwind scales -> Apple neutrals/colors ---
        // Neutral gray ramp (Apple system grays, warmer than default slate).
        slate: {
          50: '#fafafc',
          100: '#f0f0f0',
          200: '#d2d2d7',
          300: '#c7c7cc',
          400: '#aeaeb2',
          500: '#6e6e73',
          600: '#515154',
          700: '#424245',
          800: '#333336',
          900: '#1d1d1f',
          950: '#1d1d1f',
        },
        // zinc shares the same Apple neutral ramp (used by admin surfaces).
        zinc: {
          50: '#fafafc',
          100: '#f0f0f0',
          200: '#d2d2d7',
          300: '#c7c7cc',
          400: '#aeaeb2',
          500: '#6e6e73',
          600: '#515154',
          700: '#424245',
          800: '#333336',
          900: '#1d1d1f',
          950: '#1d1d1f',
        },
        // Action Blue ramp.
        blue: {
          50: '#e8f1fc',
          100: '#d0e4fa',
          200: '#a6cdf5',
          300: '#6fb0ef',
          400: '#2997ff',
          500: '#0a84e0',
          600: '#0066cc',
          700: '#0057b0',
          800: '#004a96',
          900: '#003c7a',
        },
        // Apple system green ramp.
        emerald: {
          50: '#e9f9ee',
          100: '#cdeed6',
          200: '#a7e3b7',
          300: '#74d391',
          400: '#4fc874',
          500: '#34c759',
          600: '#2aa44a',
          700: '#248a3d',
          800: '#1f6e32',
          900: '#1a5a2a',
        },
        // Apple system red ramp.
        rose: {
          50: '#fdecec',
          100: '#fbd5d4',
          200: '#f7b0ae',
          300: '#f28683',
          400: '#ff5b51',
          500: '#ff3b30',
          600: '#e02d22',
          700: '#c4271f',
          800: '#9e201a',
          900: '#7f1c17',
        },
      },
      fontFamily: {
        // -apple-system resolves to real SF Pro on Apple platforms; Pretendard is
        // the closest SF-Pro-shaped face for Korean elsewhere.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Pretendard Variable"',
          'Pretendard',
          'system-ui',
          'sans-serif',
        ],
        display: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Pretendard Variable"',
          'Pretendard',
          'system-ui',
          'sans-serif',
        ],
        serif: ['"Noto Serif KR"', 'Georgia', 'serif'],
      },
      borderRadius: {
        // Apple radius grammar — sm utility / md pearl / lg cards / full pill.
        none: '0px',
        sm: '8px',
        md: '11px',
        lg: '18px',
        xl: '18px',
        '2xl': '20px',
        '3xl': '28px',
        full: '9999px',
      },
      boxShadow: {
        // Apple uses almost no chrome elevation — hairline rings instead of shadows.
        soft: '0 0 0 1px rgba(0,0,0,0.04)',
        card: '0 8px 30px rgba(0,0,0,0.08)',   // reserved for overlays/sheets
        ring: '0 0 0 4px rgba(0,113,227,0.18)',
        // The single Apple "product" shadow — for imagery resting on a surface.
        product: '3px 5px 30px 0 rgba(0,0,0,0.22)',
      },
      letterSpacing: {
        eyebrow: '0.06em',
        tight: '-0.022em',   // signature "Apple tight" display tracking
        snug: '-0.014em',
      },
      backdropBlur: {
        nav: '20px',
      },
    },
  },
  plugins: [],
};
export default config;
