/** Shared display-name validation rules — safe to import in client and server code. */

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 20;
/** Letters, numbers, spaces, underscores, hyphens, and apostrophes. */
export const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9 _'\-]+$/;

export type NameValidation =
  | { ok: true; name: string }
  | { ok: false; error: string };

/**
 * Trims the input and checks length + character rules.
 * Does NOT check profanity — that happens server-side only.
 */
export function validateDisplayNameFormat(raw: string): NameValidation {
  const name = raw.trim();

  if (name.length < DISPLAY_NAME_MIN) {
    return { ok: false, error: `Display name must be at least ${DISPLAY_NAME_MIN} characters.` };
  }
  if (name.length > DISPLAY_NAME_MAX) {
    return { ok: false, error: `Display name must be ${DISPLAY_NAME_MAX} characters or fewer.` };
  }
  if (!DISPLAY_NAME_PATTERN.test(name)) {
    return { ok: false, error: "Letters, numbers, spaces, _, -, and ' only." };
  }

  return { ok: true, name };
}
