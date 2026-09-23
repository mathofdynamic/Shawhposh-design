/**
 * Shawhposh Admin Design Tokens
 * Refined Fashion-House Operations: warm off-white / near-black surfaces, restrained brass/gold accent,
 * high contrast, high typographic density, anti-slop zero-pill discipline.
 */

export const ADMIN_TOKENS = {
  colors: {
    // Dark Palette (Primary operational environment)
    dark: {
      bgRoot: '#0c0b0a',
      bgSurface: '#131211',
      bgSurfaceSubtle: '#181716',
      bgElevated: '#1f1d1b',
      borderSubtle: 'rgba(245, 242, 235, 0.07)',
      borderDefault: 'rgba(245, 242, 235, 0.12)',
      borderStrong: 'rgba(245, 242, 235, 0.22)',
      textPrimary: '#f5f2eb',
      textSecondary: '#b8b3a8',
      textMuted: '#7d776d',
      textFaint: '#524e47',
    },
    // Light Palette (Warm alabaster / rich linen)
    light: {
      bgRoot: '#faf8f5',
      bgSurface: '#ffffff',
      bgSurfaceSubtle: '#f4f1eb',
      bgElevated: '#ede9e1',
      borderSubtle: 'rgba(23, 21, 19, 0.08)',
      borderDefault: 'rgba(23, 21, 19, 0.14)',
      borderStrong: 'rgba(23, 21, 19, 0.25)',
      textPrimary: '#171513',
      textSecondary: '#4f4941',
      textMuted: '#787065',
      textFaint: '#a89f92',
    },
    // Signature Shawhposh Brass & Gold
    accent: {
      goldLight: '#eed29d',
      goldDefault: '#ba8d3d',
      goldMuted: '#8f6828',
      goldBg: 'rgba(186, 141, 61, 0.12)',
      goldBorder: 'rgba(186, 141, 61, 0.28)',
    },
    // Semantic Status Palette (Understated, high-contrast badges)
    status: {
      success: {
        text: '#10b981',
        textDark: '#34d399',
        bg: 'rgba(16, 185, 129, 0.10)',
        border: 'rgba(16, 185, 129, 0.25)',
        indicator: '#10b981',
      },
      warning: {
        text: '#d97706',
        textDark: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.10)',
        border: 'rgba(245, 158, 11, 0.25)',
        indicator: '#f59e0b',
      },
      danger: {
        text: '#dc2626',
        textDark: '#f87171',
        bg: 'rgba(239, 68, 68, 0.10)',
        border: 'rgba(239, 68, 68, 0.25)',
        indicator: '#ef4444',
      },
      info: {
        text: '#2563eb',
        textDark: '#60a5fa',
        bg: 'rgba(59, 130, 246, 0.10)',
        border: 'rgba(59, 130, 246, 0.25)',
        indicator: '#3b82f6',
      },
      neutral: {
        text: '#64748b',
        textDark: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.10)',
        border: 'rgba(148, 163, 184, 0.20)',
        indicator: '#94a3b8',
      },
    },
  },
  typography: {
    fontSans: 'var(--font-sans)',
    fontFaNum: 'var(--font-fanum)',
    fontMono: 'var(--font-mono)',
  },
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba8d3d] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0e0d0c]',
  transitions: {
    fast: 'duration-150 ease-out',
    normal: 'duration-200 ease-in-out',
    drawer: 'duration-250 cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;
