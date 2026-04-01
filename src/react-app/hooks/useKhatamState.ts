import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Slot, StatusKey } from "@/lib/types";
import { Q_SHORT, COLORS } from "@/lib/constants";
import { supabasePublic } from "@/lib/supabase";
import { api } from "@/lib/api";

export interface KhatamInfo {
  id: number;
  slug: string;
  khatam_num: number;
  name: string | null;
  created_at: string;
  completed_at: string | null;
  is_solo: boolean;
  show_names_on_globe: boolean;
  location_country: string | null;
  done: number;
  total: number;
}

interface DbSlot {
  id: number;
  khatam_id: number;
  juz: number;
  q: number;
  status: StatusKey;
  claimed_by: string | null;
  claimed_at: string | null;
  done_at: string | null;
}

function dbToSlot(d: DbSlot): Slot {
  return { juz: d.juz, q: d.q, status: d.status, by: d.claimed_by, at: d.claimed_at, done_at: d.done_at };
}

export function useKhatamState(slug: string) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [khatams, setKhatams] = useState<KhatamInfo[]>([]);
  const [selectedKhatamId, setSelectedKhatamId] = useState<number | null>(null);
  const [khatamNum, setKhatamNum] = useState(1);
  const [khatamName, setKhatamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modal, setModal] = useState<{ juz: number; q: number } | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminSelected, setAdminSelected] = useState<{ juz: number; q: number } | null>(null);
  const [adminPin, setAdminPin] = useState("");
  const [adminErr, setAdminErr] = useState("");
  const [newKhatamName, setNewKhatamName] = useState("");
  const lastSlug = useRef(slug);

  // Load all khatams with their completion counts
  const loadKhatams = useCallback(async (): Promise<KhatamInfo[]> => {
    const { data: allKhatams, error } = await supabasePublic
      .from("khatams")
      .select("*")
      .eq("slug", slug)
      .order("khatam_num", { ascending: false });

    if (error || !allKhatams || allKhatams.length === 0) {
      setNotFound(true);
      return [];
    }

    setNotFound(false);

    const khatamInfos: KhatamInfo[] = [];
    for (const k of allKhatams) {
      const { count } = await supabasePublic
        .from("slots")
        .select("*", { count: "exact", head: true })
        .eq("khatam_id", k.id)
        .eq("status", "dn");

      const { count: totalCount } = await supabasePublic
        .from("slots")
        .select("*", { count: "exact", head: true })
        .eq("khatam_id", k.id);

      khatamInfos.push({
        id: k.id,
        slug: k.slug,
        khatam_num: k.khatam_num,
        name: k.name ?? null,
        created_at: k.created_at,
        completed_at: k.completed_at,
        is_solo: k.is_solo ?? false,
        show_names_on_globe: k.show_names_on_globe ?? true,
        location_country: k.location_country ?? null,
        done: count ?? 0,
        total: totalCount ?? 120,
      });
    }

    setKhatams(khatamInfos);
    if (khatamInfos.length > 0) {
      setKhatamName(khatamInfos[0].name ?? "");
    }
    return khatamInfos;
  }, [slug]);

  // Load slots for a specific khatam
  const loadSlots = useCallback(async (khatamId: number) => {
    const { data: dbSlots, error } = await supabasePublic
      .from("slots")
      .select("*")
      .eq("khatam_id", khatamId)
      .order("juz")
      .order("q");

    if (error) {
      console.error("Failed to load slots:", error);
    } else {
      setSlots((dbSlots as DbSlot[]).map(dbToSlot));
    }
  }, []);

  // Initial load + reload when slug changes
  useEffect(() => {
    const isSlugChange = lastSlug.current !== slug;
    lastSlug.current = slug;

    (async () => {
      if (isSlugChange) {
        setLoading(true);
        setAdminMode(false);
        setAdminPin("");
      }
      const infos = await loadKhatams();
      if (infos.length > 0) {
        const storedId = localStorage.getItem(`selectedKhatamId:${slug}`);
        const remembered = storedId ? infos.find(k => k.id === Number(storedId)) : null;
        const target = remembered ?? infos[0];
        setSelectedKhatamId(target.id);
        setKhatamNum(target.khatam_num);
        await loadSlots(target.id);
      } else {
        setSlots([]);
        setKhatams([]);
        setSelectedKhatamId(null);
      }
      setLoading(false);
    })();
  }, [slug, loadKhatams, loadSlots]);

  // When user switches khatam
  const selectKhatam = useCallback(async (khatamId: number) => {
    const info = khatams.find(k => k.id === khatamId);
    if (!info) return;
    localStorage.setItem(`selectedKhatamId:${slug}`, String(khatamId));
    setSelectedKhatamId(khatamId);
    setKhatamNum(info.khatam_num);
    setAdminSelected(null);
    setModal(null);
    setLoading(true);
    await loadSlots(khatamId);
    setLoading(false);
  }, [slug, khatams, loadSlots]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedKhatamId) return;

    const channel = supabasePublic
      .channel(`slots-realtime-${selectedKhatamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "khatam_public", table: "slots", filter: `khatam_id=eq.${selectedKhatamId}` },
        () => {
          loadSlots(selectedKhatamId);
          loadKhatams();
        }
      )
      .subscribe();

    return () => { supabasePublic.removeChannel(channel); };
  }, [selectedKhatamId, loadSlots, loadKhatams]);

  const latestKhatamId = khatams.length > 0 ? khatams[0].id : null;
  const isLatestKhatam = selectedKhatamId === latestKhatamId;

  // Derive solo mode from the currently selected khatam
  const isSolo = khatams.find(k => k.id === selectedKhatamId)?.is_solo ?? false;

  const getSlot = useCallback((juz: number, q: number) => slots.find(s => s.juz === juz && s.q === q)!, [slots]);
  const countActive = useCallback((name: string) => slots.filter(s => s.by?.toLowerCase() === name.toLowerCase() && s.status === "cl").length, [slots]);

  const done = slots.filter(s => s.status === "dn").length;
  const prog = slots.filter(s => s.status === "cl").length;
  const rem = 120 - done - prog;
  const pct = slots.length ? Math.round((done / 120) * 100) : 0;
  const khatmComplete = slots.length > 0 && done === 120;

  const onBook = async (juz: number, q: number, name: string): Promise<{ err: string } | undefined> => {
    const slot = getSlot(juz, q);
    if (slot.status !== "av") return { err: "This quarter was just claimed. Please choose another." };
    if (countActive(name) >= 8) return { err: "You've reached the limit of 8 quarters. Complete your current portions first." };

    try {
      await api.claim(slug, juz, q, name);
    } catch (e: any) {
      return { err: e.message || "Failed to claim. Please try again." };
    }

    await loadSlots(selectedKhatamId!);
    await loadKhatams();
  };

  const onBookJuz = async (juz: number, name: string): Promise<{ err: string } | undefined> => {
    const juzSlots = slots.filter(s => s.juz === juz);
    if (juzSlots.some(s => s.status !== "av")) return { err: "Some quarters in this Juz are no longer available." };
    if (countActive(name) + 4 > 8) return { err: "Claiming a full Juz would exceed the limit of 8 active quarters." };

    try {
      await api.claimJuz(slug, juz, name);
    } catch (e: any) {
      return { err: e.message || "Failed to claim. Please try again." };
    }

    await loadSlots(selectedKhatamId!);
    await loadKhatams();
  };

  const onComplete = async (juz: number, q: number, name: string): Promise<{ err: string } | undefined> => {
    const slot = getSlot(juz, q);
    if (slot.by && name.toLowerCase() !== slot.by.toLowerCase()) return { err: `This was claimed by ${slot.by}. Names don't match.` };

    try {
      await api.complete(slug, juz, q, name);
    } catch (e: any) {
      return { err: e.message || "Failed to mark complete. Please try again." };
    }

    await loadSlots(selectedKhatamId!);
    await loadKhatams();
  };

  // Solo: toggle a slot av↔dn with optimistic update
  const onSoloToggle = async (juz: number, q: number) => {
    const slot = getSlot(juz, q);
    const willBeDone = slot.status !== "dn";

    // Optimistic update for instant feedback
    setSlots(prev => prev.map(s =>
      s.juz === juz && s.q === q
        ? { ...s, status: willBeDone ? "dn" : "av", done_at: willBeDone ? new Date().toISOString() : null }
        : s
    ));

    try {
      await api.soloToggle(slug, juz, q);
    } catch (e: any) {
      // Revert on error
      setSlots(prev => prev.map(s => s.juz === juz && s.q === q ? slot : s));
      toast.error(e.message || "Failed to update");
      return;
    }

    if (willBeDone) {
      toast.success(`Juz ${juz} ${Q_SHORT[q - 1]} ✓`);
    }

    await loadKhatams();
  };

  const startNewKhatam = async () => {
    if (!adminMode) return;
    const trimmedName = newKhatamName.trim() || undefined;

    try {
      await api.adminNewKhatam(slug, adminPin, trimmedName);
    } catch (e: any) {
      toast.error(e.message || "Failed to start new khatam");
      return;
    }

    setAdminSelected(null);
    setNewKhatamName("");
    toast(trimmedName ? `"${trimmedName}" has begun — Bismillah!` : `Khatam ${khatamNum + 1} has begun — Bismillah!`);
    const infos = await loadKhatams();
    if (infos.length > 0) {
      setSelectedKhatamId(infos[0].id);
      setKhatamNum(infos[0].khatam_num);
      await loadSlots(infos[0].id);
    }
  };

  const soloStartNewKhatam = async () => {
    const trimmedName = newKhatamName.trim() || undefined;

    try {
      await api.soloNewKhatam(slug, trimmedName);
    } catch (e: any) {
      toast.error(e.message || "Failed to start new khatam");
      return;
    }

    setNewKhatamName("");
    toast(trimmedName ? `"${trimmedName}" has begun — Bismillah!` : `Khatam ${khatamNum + 1} has begun — Bismillah!`);
    const infos = await loadKhatams();
    if (infos.length > 0) {
      setSelectedKhatamId(infos[0].id);
      setKhatamNum(infos[0].khatam_num);
      await loadSlots(infos[0].id);
    }
  };

  const soloResetAll = async () => {
    if (!selectedKhatamId) return;
    const confirmed = window.confirm("Reset all quarters to available? This cannot be undone.");
    if (!confirmed) return;

    try {
      await api.soloReset(slug);
    } catch (e: any) {
      toast.error(e.message || "Failed to reset");
      return;
    }

    toast.success("All quarters reset");
    await loadSlots(selectedKhatamId);
    await loadKhatams();
  };

  const soloDeleteKhatam = async () => {
    if (!selectedKhatamId) return;
    const confirmed = window.confirm(`Permanently delete Khatam #${khatamNum}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.soloDelete(slug);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
      return;
    }

    toast.success(`Khatam #${khatamNum} deleted`);
    const infos = await loadKhatams();
    if (infos.length > 0) {
      setSelectedKhatamId(infos[0].id);
      setKhatamNum(infos[0].khatam_num);
      await loadSlots(infos[0].id);
    } else {
      setSlots([]);
      setSelectedKhatamId(null);
      setKhatamNum(1);
    }
  };

  const tryAdmin = async () => {
    try {
      const { valid } = await api.verifyPin(slug, adminPin);
      if (valid) {
        setAdminMode(true);
        setAdminErr("");
        toast.success("Admin mode active");
      } else {
        setAdminErr("Incorrect pin");
      }
    } catch {
      setAdminErr("Failed to verify pin");
    }
  };

  const adminSetStatus = async (st: StatusKey) => {
    if (!adminSelected || !adminMode) return;
    const { juz, q } = adminSelected;

    try {
      await api.adminSetStatus(slug, adminPin, juz, q, st);
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
      return;
    }

    toast(`Set to ${COLORS[st].label}`);
    await loadSlots(selectedKhatamId!);
    await loadKhatams();
  };

  const deactivateAdmin = () => {
    setAdminMode(false);
    setAdminSelected(null);
    setAdminPin("");
    toast("Admin mode off");
  };

  const adminResetAllToAvailable = async () => {
    if (!selectedKhatamId || !adminMode) return;
    const confirmed = window.confirm("Reset ALL quarters in this khatam to Available? This cannot be undone.");
    if (!confirmed) return;

    try {
      await api.adminResetAll(slug, adminPin);
    } catch (e: any) {
      toast.error(e.message || "Failed to reset slots to available");
      return;
    }

    toast.success("All quarters reset to Available");
    await loadSlots(selectedKhatamId);
    await loadKhatams();
  };

  const adminResetJuzToAvailable = async () => {
    if (!selectedKhatamId || !adminSelected || !adminMode) return;
    const { juz } = adminSelected;
    const confirmed = window.confirm(`Reset all quarters in Juz ${juz} to Available?`);
    if (!confirmed) return;

    try {
      await api.adminResetJuz(slug, adminPin, juz);
    } catch (e: any) {
      toast.error(e.message || "Failed to reset Juz to available");
      return;
    }

    toast.success(`All quarters in Juz ${juz} reset to Available`);
    await loadSlots(selectedKhatamId);
    await loadKhatams();
  };

  const adminDeleteKhatam = async () => {
    if (!selectedKhatamId || !adminMode) return;
    const confirmed = window.confirm(
      `Permanently delete Khatam #${khatamNum} and all its slots? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.adminDelete(slug, adminPin);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete khatam");
      return;
    }

    setAdminSelected(null);
    setModal(null);
    toast.success(`Khatam #${khatamNum} deleted`);
    const infos = await loadKhatams();
    if (infos.length > 0) {
      setSelectedKhatamId(infos[0].id);
      setKhatamNum(infos[0].khatam_num);
      await loadSlots(infos[0].id);
    } else {
      setSlots([]);
      setSelectedKhatamId(null);
      setKhatamNum(1);
    }
  };

  const adminToggleGlobeNames = async () => {
    if (!adminMode) return;
    try {
      const result = await api.adminToggleGlobeNames(slug, adminPin);
      toast.success(result.show_names_on_globe ? "Names shown on globe" : "Names hidden on globe");
      await loadKhatams();
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    }
  };

  const selectedKhatamInfo = khatams.find(k => k.id === selectedKhatamId);

  return {
    slug, slots, khatamNum, khatamName, khatams, selectedKhatamId, isLatestKhatam,
    loading, notFound, modal, setModal,
    isSolo,
    showNamesOnGlobe: selectedKhatamInfo?.show_names_on_globe ?? true,
    locationCountry: selectedKhatamInfo?.location_country ?? null,
    adminMode, adminSelected, setAdminSelected,
    adminPin, setAdminPin, adminErr,
    newKhatamName, setNewKhatamName,
    done, prog, rem, pct, khatmComplete,
    getSlot, onBook, onBookJuz, onComplete, onSoloToggle,
    selectKhatam,
    startNewKhatam, soloStartNewKhatam, soloResetAll, soloDeleteKhatam,
    tryAdmin, adminSetStatus, deactivateAdmin,
    adminResetAllToAvailable, adminResetJuzToAvailable, adminDeleteKhatam,
    adminToggleGlobeNames,
  };
}
