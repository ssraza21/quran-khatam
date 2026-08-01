export type StatusKey = "av" | "cl" | "dn";
export type ParticipationMode = "open" | "group";
export type CampaignGoalType = "quran_khatam" | "surah_recitation";

export interface CampaignGoal {
  id: number;
  campaign_id: number;
  goal_type: CampaignGoalType;
  surah_number: number | null;
  target: number;
  display_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  pledged: number;
  completed: number;
  in_progress: number;
  contributor_count: number;
}

export interface RecitationContribution {
  id: number;
  participant_name: string;
  pledged_count: number;
  completed_count: number;
  created_at: string;
  updated_at: string;
}

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
  claim_limit?: number;
  location_city?: string | null;
  location_country?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  show_names_on_globe?: boolean;
  campaign_id?: number | null;
  campaign_name?: string;
  campaign_description?: string | null;
  campaign_searchable?: boolean;
  campaign_goal?: number;
  participation_mode?: ParticipationMode;
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
