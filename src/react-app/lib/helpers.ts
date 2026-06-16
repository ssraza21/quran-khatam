import type { Slot, StatusKey } from "./types";

export function juzSlotsOwnedBy(slots: Slot[], juz: number, name: string): boolean {
  const juzSlots = slots.filter(s => s.juz === juz);
  if (juzSlots.length !== 4) return false;
  return juzSlots.every(
    s => s.status === "cl" && s.by?.toLowerCase() === name.toLowerCase()
  );
}

export function juzReadyToComplete(slots: Slot[], juz: number): boolean {
  const juzSlots = slots.filter(s => s.juz === juz);
  if (juzSlots.length !== 4) return false;
  if (!juzSlots.every(s => s.status === "cl")) return false;
  const owners = [...new Set(juzSlots.map(s => s.by?.toLowerCase()).filter(Boolean))];
  return owners.length === 1;
}

export function juzOwnerName(slots: Slot[], juz: number): string | null {
  const juzSlots = slots.filter(s => s.juz === juz);
  const names = [...new Set(juzSlots.map(s => s.by).filter(Boolean) as string[])];
  return names.length === 1 ? names[0] : null;
}

export function buildWhatsAppKhatamMessage(khatamName: string, slug: string, slots: Slot[]): string {
  const lines: string[] = [];
  lines.push(`*${khatamName}*`);
  lines.push(`Claim your Juz here 👇`);
  lines.push(`qurankhatam.com/k/${slug}`);
  lines.push("");

  for (let juz = 1; juz <= 30; juz++) {
    const juzSlots = slots.filter(s => s.juz === juz);
    const names = [...new Set(juzSlots.map(s => s.by).filter(Boolean) as string[])];
    lines.push(`${juz}. ${names.join(", ")}`);
  }

  return lines.join("\n");
}

export function makeDummySlots(): Slot[] {
  const names = ["Ahmad", "Fatima", "Yusuf", "Maryam", "Ibrahim", "Aisha", "Omar", "Zainab", "Hassan", "Noor", "Bilal", "Khadija"];
  const counts: Record<string, number> = {};
  return Array.from({ length: 120 }, (_, i) => {
    const juz = Math.floor(i / 4) + 1;
    const q = (i % 4) + 1;
    const r = Math.random();
    let status: StatusKey = "av", by: string | null = null, at: string | null = null, done_at: string | null = null;
    if (r < 0.3) {
      const n = names[Math.floor(Math.random() * names.length)];
      if ((counts[n] || 0) < 8) {
        status = "dn"; by = n;
        at = new Date(Date.now() - Math.random() * 3.6e6 * 4).toISOString();
        done_at = new Date(Date.now() - Math.random() * 3.6e6).toISOString();
        counts[n] = (counts[n] || 0) + 1;
      }
    } else if (r < 0.5) {
      const n = names[Math.floor(Math.random() * names.length)];
      if ((counts[n] || 0) < 8) {
        status = "cl"; by = n;
        at = new Date(Date.now() - Math.random() * 3.6e6 * 2).toISOString();
        counts[n] = (counts[n] || 0) + 1;
      }
    }
    return { juz, q, status, by, at, done_at };
  });
}

export function timeAgo(iso: string | null) {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

export function isStale(slot: Slot) {
  return slot.status === "cl" && slot.at && Date.now() - new Date(slot.at).getTime() > 36e5;
}
