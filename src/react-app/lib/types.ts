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
  is_solo: boolean;
  location_city?: string | null;
  location_country?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  show_names_on_globe?: boolean;
}

export interface GlobeMarker {
  lat: number;
  lng: number;
  location: string;
  count: number;
  isRecent: boolean;
}

export interface GlobeCompletion {
  juz: number;
  q: number;
  khatam_name: string;
  location: string;
  completed_at: string;
  name: string | null;
}

export interface GlobeData {
  markers: GlobeMarker[];
  recent: GlobeCompletion[];
  total_completions: number;
  total_locations: number;
}
