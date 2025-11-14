export function clampHours(value: number) {
  if (!Number.isFinite(value)) return 48;
  return Math.min(168, Math.max(1, value));
}

