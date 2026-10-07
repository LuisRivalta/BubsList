// No matchMedia (tests, very old browsers) counts as "reduced": animations are extras, never required.
export const prefersReducedMotion = () =>
  typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
