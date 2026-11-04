import type { Slot } from "./types";

/** Display name for a khatam: its own name, or "Khatam N" when it has none. */
export function khatamLabel(k: { name?: string | null; khatam_num: number }) {
  return k.name?.trim() || `Khatam ${k.khatam_num}`;
}

export function buildWhatsAppKhatamMessage(khatamName: string, slug: string, slots: Slot[]): string {
  const lines: string[] = [];
  lines.push(`*${khatamName}*`);
  lines.push(`Pick a Juz to read:`);
  lines.push(`qurankhatam.com/k/${slug}`);
  lines.push("");

  for (let juz = 1; juz <= 30; juz++) {
    const juzSlots = slots.filter(s => s.juz === juz);
    const names = [...new Set(juzSlots.map(s => s.by).filter(Boolean) as string[])];
    lines.push(`${juz}. ${names.join(", ")}`);
  }

  return lines.join("\n");
}

export function timeAgo(iso: string | null) {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

