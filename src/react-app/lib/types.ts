export type StatusKey = "av" | "cl" | "dn";

export interface Slot {
  juz: number;
  q: number;
  status: StatusKey;
  by: string | null;
  at: string | null;
  done_at: string | null;
}

export interface StatusColor {
  bg: string;
  border: string;
  text: string;
  accent: string;
  accentBg: string;
  label: string;
}
