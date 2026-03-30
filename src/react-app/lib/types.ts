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

export interface KhatamPublic {
  id: number;
  slug: string;
  name: string;
  khatam_num: number;
  created_at: string;
  completed_at: string | null;
}
