// lib/design-tokens.ts
export const colors = {
  bg: '#000000',
  bgElevated: '#0A0A0A',
  bgOverlay: '#141414',
  border: '#1F1F1F',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8A8E',
  textTertiary: '#48484A',
  accentGreen: '#34C759',
  accentCrimson: '#FF2D55',
  accentWarning: '#FF9500',
} as const;

export const easing = {
  appleStandard: [0.16, 1, 0.3, 1] as const,
  appleEntrance: [0.32, 0.72, 0, 1] as const,
};

export const durations = {
  fast: 0.18,
  base: 0.24,
  slow: 0.32,
} as const;
