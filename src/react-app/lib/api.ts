import type {
  CampaignGoal,
  GlobeData,
  ParticipationMode,
  RecitationContribution,
} from "@/lib/types";

const BASE = "/api";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}

export interface KhatamCreateResult {
  slug: string;
  name: string;
  id: number;
  campaign_name: string;
}

export interface KhatamMeta {
  id: number;
  slug: string;
  name: string;
  khatam_num: number;
  display_order?: number;
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
  done?: number;
  total?: number;
  started?: boolean;
  participation_mode?: ParticipationMode;
}

export interface ParticipantInfo {
  name: string;
  claim_limit: number | null;
}

export interface CampaignSearchResult {
  slug: string;
  campaign_name: string;
  description: string | null;
  round_name: string;
  khatam_num: number;
}

export interface CampaignDirectoryItem {
  slug: string;
  campaign_name: string;
  description: string | null;
  is_featured: boolean;
  goal: number;
  total_khatams: number;
  in_progress_khatams: number;
  completed_khatams: number;
  active_round_name: string;
  active_round_num: number;
  goals: CampaignGoal[];
}

export const api = {
  createKhatam(
    name: string,
    slug: string,
    pin: string,
    is_solo?: boolean,
    location_city?: string,
    location_country?: string,
    location_lat?: number,
    location_lng?: number,
    show_names_on_globe?: boolean,
    round_name?: string,
    description?: string,
    is_searchable?: boolean,
  ) {
    return request<KhatamCreateResult>("/khatams", {
      method: "POST",
      body: JSON.stringify({
        name,
        slug,
        pin,
        is_solo,
        location_city: location_city || undefined,
        location_country: location_country || undefined,
        location_lat,
        location_lng,
        show_names_on_globe,
        round_name: round_name || undefined,
        description: description || undefined,
        is_searchable,
      }),
    });
  },

  searchKhatams(query: string) {
    return request<{ results: CampaignSearchResult[] }>(
      `/khatams/search?q=${encodeURIComponent(query)}`
    );
  },

  getCampaignDirectory(query = "", limit = 24, offset = 0) {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      offset: String(offset),
    });
    return request<{ campaigns: CampaignDirectoryItem[]; total: number }>(
      `/campaigns?${params.toString()}`
    );
  },

  getCampaignGoals(slug: string) {
    return request<{
      campaign: {
        id: number;
        slug: string;
        name: string;
        description: string | null;
        is_searchable: boolean;
        is_featured: boolean;
      };
      goals: CampaignGoal[];
    }>(`/campaigns/${slug}/goals`);
  },

  getSurahContributions(slug: string, goalId: number) {
    return request<{ contributions: RecitationContribution[] }>(
      `/campaigns/${slug}/goals/${goalId}/contributions`,
    );
  },

  pledgeSurahRecitations(slug: string, goalId: number, name: string, quantity: number) {
    return request<{ ok: boolean }>(`/campaigns/${slug}/goals/${goalId}/pledge`, {
      method: "POST",
      body: JSON.stringify({ name, quantity }),
    });
  },

  completeSurahRecitations(slug: string, goalId: number, name: string, quantity: number) {
    return request<{ ok: boolean }>(`/campaigns/${slug}/goals/${goalId}/complete`, {
      method: "POST",
      body: JSON.stringify({ name, quantity }),
    });
  },

  adminSaveSurahGoal(
    slug: string,
    pin: string,
    options: {
      goalId?: number;
      surahNumber: number;
      target: number;
      isEnabled?: boolean;
    },
  ) {
    return request<{ ok: boolean; goal_id: number }>(`/campaigns/${slug}/admin/goals`, {
      method: "POST",
      body: JSON.stringify({
        pin,
        goal_id: options.goalId,
        surah_number: options.surahNumber,
        target: options.target,
        is_enabled: options.isEnabled ?? true,
      }),
    });
  },

  adminSetCampaignGoalEnabled(slug: string, pin: string, goalId: number, isEnabled: boolean) {
    return request<{ ok: boolean; is_enabled: boolean }>(
      `/campaigns/${slug}/admin/goals/${goalId}/enabled`,
      {
        method: "POST",
        body: JSON.stringify({ pin, is_enabled: isEnabled }),
      },
    );
  },

  adminSetSurahContribution(
    slug: string,
    pin: string,
    goalId: number,
    name: string,
    pledgedCount: number,
    completedCount: number,
  ) {
    return request<{ ok: boolean }>(
      `/campaigns/${slug}/admin/goals/${goalId}/contributions`,
      {
        method: "POST",
        body: JSON.stringify({
          pin,
          name,
          pledged_count: pledgedCount,
          completed_count: completedCount,
        }),
      },
    );
  },

  getKhatam(slug: string) {
    return request<KhatamMeta>(`/khatams/${slug}`);
  },

  getHistory(slug: string) {
    return request<KhatamMeta[]>(`/khatams/${slug}/history`);
  },

  verifyPin(slug: string, pin: string) {
    return request<{ valid: boolean }>(`/khatams/${slug}/verify-pin`, {
      method: "POST",
      body: JSON.stringify({ pin }),
    });
  },

  claim(slug: string, juz: number, q: number, name: string, khatamId?: number) {
    return request<{ ok: boolean }>(`/khatams/${slug}/claim`, {
      method: "POST",
      body: JSON.stringify({ juz, q, name, khatam_id: khatamId }),
    });
  },

  claimJuz(slug: string, juz: number, name: string, khatamId?: number) {
    return request<{ ok: boolean; claimed: number }>(`/khatams/${slug}/claim-juz`, {
      method: "POST",
      body: JSON.stringify({ juz, name, khatam_id: khatamId }),
    });
  },

  complete(slug: string, juz: number, q: number, name: string, khatamId?: number) {
    return request<{ ok: boolean }>(`/khatams/${slug}/complete`, {
      method: "POST",
      body: JSON.stringify({ juz, q, name, khatam_id: khatamId }),
    });
  },

  completeJuz(slug: string, juz: number, name: string, khatamId?: number) {
    return request<{ ok: boolean; completed: number }>(`/khatams/${slug}/complete-juz`, {
      method: "POST",
      body: JSON.stringify({ juz, name, khatam_id: khatamId }),
    });
  },

  adminSetStatus(slug: string, pin: string, juz: number, q: number, status: string, name?: string, khatamId?: number) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/set-status`, {
      method: "POST",
      body: JSON.stringify({ pin, juz, q, status, name, khatam_id: khatamId }),
    });
  },

  adminAssignJuz(slug: string, pin: string, juz: number, status: string, name?: string, khatamId?: number) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/assign-juz`, {
      method: "POST",
      body: JSON.stringify({ pin, juz, status, name, khatam_id: khatamId }),
    });
  },

  adminSetClaimLimit(slug: string, pin: string, limit: number, khatamId?: number) {
    return request<{ ok: boolean; claim_limit: number }>(`/khatams/${slug}/admin/set-claim-limit`, {
      method: "POST",
      body: JSON.stringify({ pin, limit, khatam_id: khatamId }),
    });
  },

  adminUpdateCampaign(
    slug: string,
    pin: string,
    name: string,
    description: string,
    isSearchable: boolean,
  ) {
    return request<{
      ok: boolean;
      campaign_name: string;
      campaign_description: string | null;
      campaign_searchable: boolean;
    }>(`/khatams/${slug}/admin/campaign`, {
      method: "POST",
      body: JSON.stringify({
        pin,
        name,
        description,
        is_searchable: isSearchable,
      }),
    });
  },

  adminAssignAll(slug: string, pin: string, name: string, khatamId?: number) {
    return request<{ ok: boolean; assigned: number }>(`/khatams/${slug}/admin/assign-all`, {
      method: "POST",
      body: JSON.stringify({ pin, name, khatam_id: khatamId }),
    });
  },

  adminCompleteAll(slug: string, pin: string, khatamId: number) {
    return request<{ ok: boolean; completed: number }>(`/khatams/${slug}/admin/complete-all`, {
      method: "POST",
      body: JSON.stringify({ pin, khatam_id: khatamId }),
    });
  },

  adminCreateKhatams(
    slug: string,
    pin: string,
    options: {
      count: number;
      name?: string;
      namePrefix?: string;
      participationMode: ParticipationMode;
      completed: boolean;
    },
  ) {
    return request<{ ok: boolean; created: number; ids: number[] }>(
      `/khatams/${slug}/admin/create-khatams`,
      {
        method: "POST",
        body: JSON.stringify({
          pin,
          count: options.count,
          name: options.name,
          name_prefix: options.namePrefix,
          participation_mode: options.participationMode,
          completed: options.completed,
        }),
      },
    );
  },

  adminReorderKhatams(slug: string, pin: string, orderedIds: number[]) {
    return request<{ ok: boolean; reordered: number }>(`/khatams/${slug}/admin/reorder`, {
      method: "POST",
      body: JSON.stringify({ pin, ordered_ids: orderedIds }),
    });
  },

  adminBulkCreateRounds(slug: string, pin: string, targetTotal: number, namePrefix?: string) {
    return request<{ ok: boolean; created: number; target_total: number }>(
      `/khatams/${slug}/admin/bulk-new-khatams`,
      {
        method: "POST",
        body: JSON.stringify({
          pin,
          target_total: targetTotal,
          name_prefix: namePrefix || undefined,
        }),
      },
    );
  },

  adminRenameKhatam(slug: string, pin: string, name: string, khatamId: number) {
    return request<{ ok: boolean; id: number; name: string }>(
      `/khatams/${slug}/admin/rename`,
      {
        method: "POST",
        body: JSON.stringify({ pin, name, khatam_id: khatamId }),
      },
    );
  },

  adminSetParticipationMode(
    slug: string,
    pin: string,
    participationMode: ParticipationMode,
    khatamId: number,
  ) {
    return request<{ ok: boolean; participation_mode: ParticipationMode }>(
      `/khatams/${slug}/admin/participation-mode`,
      {
        method: "POST",
        body: JSON.stringify({
          pin,
          participation_mode: participationMode,
          khatam_id: khatamId,
        }),
      },
    );
  },

  adminDuplicateKhatam(slug: string, pin: string, khatamId: number) {
    return request<KhatamMeta>(`/khatams/${slug}/admin/duplicate`, {
      method: "POST",
      body: JSON.stringify({ pin, khatam_id: khatamId }),
    });
  },

  adminRecordCompletedKhatam(slug: string, pin: string, name: string, khatamId: number) {
    return request<KhatamMeta>(`/khatams/${slug}/admin/record-completed`, {
      method: "POST",
      body: JSON.stringify({ pin, name, khatam_id: khatamId }),
    });
  },

  adminGetParticipants(slug: string, pin: string) {
    return request<{ participants: ParticipantInfo[] }>(
      `/khatams/${slug}/admin/participants?pin=${encodeURIComponent(pin)}`
    );
  },

  adminAddParticipant(slug: string, pin: string, name: string) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/participants`, {
      method: "POST",
      body: JSON.stringify({ pin, name }),
    });
  },

  adminRemoveParticipant(slug: string, pin: string, name: string) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/participants`, {
      method: "DELETE",
      body: JSON.stringify({ pin, name }),
    });
  },

  adminSetParticipantLimit(slug: string, pin: string, name: string, limit: number | null) {
    return request<{ ok: boolean; name: string; claim_limit: number | null }>(
      `/khatams/${slug}/admin/set-participant-limit`,
      { method: "POST", body: JSON.stringify({ pin, name, limit }) },
    );
  },

  adminResetAll(slug: string, pin: string, khatamId?: number) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/reset-all`, {
      method: "POST",
      body: JSON.stringify({ pin, khatam_id: khatamId }),
    });
  },

  adminResetJuz(slug: string, pin: string, juz: number, khatamId?: number) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/reset-juz`, {
      method: "POST",
      body: JSON.stringify({ pin, juz, khatam_id: khatamId }),
    });
  },

  adminNewKhatam(slug: string, pin: string, name?: string) {
    return request<KhatamMeta>(`/khatams/${slug}/admin/new-khatam`, {
      method: "POST",
      body: JSON.stringify({ pin, name }),
    });
  },

  adminDelete(slug: string, pin: string, khatamId?: number) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/delete`, {
      method: "DELETE",
      body: JSON.stringify({ pin, khatam_id: khatamId }),
    });
  },

  adminToggleGlobeNames(slug: string, pin: string, khatamId?: number) {
    return request<{ ok: boolean; show_names_on_globe: boolean }>(
      `/khatams/${slug}/admin/toggle-globe-names`,
      { method: "POST", body: JSON.stringify({ pin, khatam_id: khatamId }) }
    );
  },

  soloToggle(slug: string, juz: number, q: number) {
    return request<{ ok: boolean; status: string }>(`/khatams/${slug}/solo-toggle`, {
      method: "POST",
      body: JSON.stringify({ juz, q }),
    });
  },

  soloReset(slug: string) {
    return request<{ ok: boolean }>(`/khatams/${slug}/solo/reset-all`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  soloNewKhatam(slug: string, name?: string) {
    return request<KhatamMeta>(`/khatams/${slug}/solo/new-khatam`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  soloDelete(slug: string) {
    return request<{ ok: boolean }>(`/khatams/${slug}/solo/delete`, {
      method: "DELETE",
      body: JSON.stringify({}),
    });
  },

  getGlobeData() {
    return request<GlobeData>("/globe");
  },
};
