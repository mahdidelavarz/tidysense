// Small cross-feature form helpers. Kept intentionally tiny; promote a
// function out of here only after it is duplicated by real feature code.

/** Converts an empty form string to `null` for optional API fields. */
export function emptyToNull(value: string): string | null {
  return value || null
}
