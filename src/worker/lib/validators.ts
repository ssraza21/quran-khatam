const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !slug.includes("--");
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}
