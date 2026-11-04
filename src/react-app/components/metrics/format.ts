import { COLORS } from "@/lib/constants";
import type { StatusKey } from "@/lib/types";

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Solid fill for a quarter in bars and the Juz map; matches the tracker's Juz grid. */
export function statusFill(status: StatusKey): string {
  return status === "av" ? "#E7E5E4" /* stone-200 */ : COLORS[status].accent;
}
