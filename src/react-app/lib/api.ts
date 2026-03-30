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
}

export const api = {
  createKhatam(name: string, slug: string, pin: string) {
    return request<KhatamCreateResult>("/khatams", {
      method: "POST",
      body: JSON.stringify({ name, slug, pin }),
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

  claim(slug: string, juz: number, q: number, name: string) {
    return request<{ ok: boolean }>(`/khatams/${slug}/claim`, {
      method: "POST",
      body: JSON.stringify({ juz, q, name }),
    });
  },

  complete(slug: string, juz: number, q: number, name: string) {
    return request<{ ok: boolean }>(`/khatams/${slug}/complete`, {
      method: "POST",
      body: JSON.stringify({ juz, q, name }),
    });
  },

  adminSetStatus(slug: string, pin: string, juz: number, q: number, status: string) {
    return request<{ ok: boolean }>(`/khatams/${slug}/admin/set-status`, {
      method: "POST",
      body: JSON.stringify({ pin, juz, q, status }),
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
};
