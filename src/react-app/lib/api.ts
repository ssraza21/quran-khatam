import type { GlobeData } from "@/lib/types";

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
}

export interface KhatamMeta {
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
      }),
    });
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

  adminSetStatus(slug: string, pin: string, juz: number, q: number, status: string, name?: string) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/set-status`, {
      method: "POST",
      body: JSON.stringify({ pin, juz, q, status, name }),
    });
  },

  adminAssignJuz(slug: string, pin: string, juz: number, status: string, name?: string) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/assign-juz`, {
      method: "POST",
      body: JSON.stringify({ pin, juz, status, name }),
    });
  },

  adminSetClaimLimit(slug: string, pin: string, limit: number) {
    return request<{ ok: boolean; claim_limit: number }>(`/khatams/${slug}/admin/set-claim-limit`, {
      method: "POST",
      body: JSON.stringify({ pin, limit }),
    });
  },

  adminGetParticipants(slug: string, pin: string) {
    return request<{ participants: string[] }>(
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

  adminResetAll(slug: string, pin: string) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/reset-all`, {
      method: "POST",
      body: JSON.stringify({ pin }),
    });
  },

  adminResetJuz(slug: string, pin: string, juz: number) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/reset-juz`, {
      method: "POST",
      body: JSON.stringify({ pin, juz }),
    });
  },

  adminNewKhatam(slug: string, pin: string, name?: string) {
    return request<KhatamMeta>(`/khatams/${slug}/admin/new-khatam`, {
      method: "POST",
      body: JSON.stringify({ pin, name }),
    });
  },

  adminDelete(slug: string, pin: string) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/delete`, {
      method: "DELETE",
      body: JSON.stringify({ pin }),
    });
  },

  adminToggleGlobeNames(slug: string, pin: string) {
    return request<{ ok: boolean; show_names_on_globe: boolean }>(
      `/khatams/${slug}/admin/toggle-globe-names`,
      { method: "POST", body: JSON.stringify({ pin }) }
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
