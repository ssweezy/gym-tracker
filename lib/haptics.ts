// navigator.vibrate is supported on Android Chrome / Firefox but NOT on iOS Safari.
// We use it best-effort — no-op on unsupported devices.

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignored */
  }
}

/** Tiny tap — for nav, chips, filters. ~10ms */
export function tapSoft(): void {
  vibrate(8);
}

/** Standard click — for primary buttons, toggle pressed, picker selection. ~18ms */
export function tapMedium(): void {
  vibrate(18);
}

/** Emphatic — for "Записать подход" success, finish workout, plan activate. */
export function tapSuccess(): void {
  vibrate([15, 40, 15]);
}

/** Error / warning — for failed validation. */
export function tapError(): void {
  vibrate([40, 60, 40]);
}
