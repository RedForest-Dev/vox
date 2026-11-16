import { useCallback } from 'react';
import { HAPTIC_GUILLOTINE_PATTERN } from '../types';

export type HapticKind = 'tap' | 'soft' | 'strong' | 'match' | 'guillotine';

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 12,
  soft: 25,
  strong: 70,
  match: [40, 60, 40],
  guillotine: [...HAPTIC_GUILLOTINE_PATTERN],
};

export function vibrate(kind: HapticKind): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* blocked by browser policy: ignore */
  }
}

export function useHaptic() {
  return useCallback((kind: HapticKind) => vibrate(kind), []);
}
