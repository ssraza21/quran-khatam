const key = (slug: string) => `qk_admin_pin_${slug}`;

export function getStoredAdminPin(slug: string): string {
  try {
    return sessionStorage.getItem(key(slug)) ?? "";
  } catch {
    return "";
  }
}

export function storeAdminPin(slug: string, pin: string) {
  try {
    if (pin) sessionStorage.setItem(key(slug), pin);
    else sessionStorage.removeItem(key(slug));
  } catch {
    // ignore
  }
}

export function clearAdminPin(slug: string) {
  storeAdminPin(slug, "");
}
