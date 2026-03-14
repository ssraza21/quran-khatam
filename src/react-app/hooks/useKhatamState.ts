import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Slot, StatusKey } from "@/lib/types";
import { Q_SHORT, COLORS, ADMIN_PW } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export interface KhatamInfo {
  id: number;
  khatam_num: number;
  created_at: string;
  completed_at: string | null;
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

export type GroupName = "brothers" | "sisters";

export function useKhatamState(group: GroupName = "brothers") {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [khatams, setKhatams] = useState<KhatamInfo[]>([]);
  const [selectedKhatamId, setSelectedKhatamId] = useState<number | null>(null);
  const [khatamNum, setKhatamNum] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ juz: number; q: number } | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminSelected, setAdminSelected] = useState<{ juz: number; q: number } | null>(null);
  const [adminPw, setAdminPw] = useState("");
  const [adminErr, setAdminErr] = useState("");
  const lastGroup = useRef(group);

  // Load all khatams with their completion counts
  const loadKhatams = useCallback(async (): Promise<KhatamInfo[]> => {
    const { data: allKhatams, error } = await supabase
      .from("khatams")
      .select("*")
      .eq("group_name", group)
      .order("khatam_num", { ascending: false });

    if (error || !allKhatams || allKhatams.length === 0) return [];

    // Get completion counts for each khatam
    const khatamInfos: KhatamInfo[] = [];
    for (const k of allKhatams) {
      const { count } = await supabase
        .from("slots")
        .select("*", { count: "exact", head: true })
        .eq("khatam_id", k.id)
        .eq("status", "dn");

      const { count: totalCount } = await supabase
        .from("slots")
        .select("*", { count: "exact", head: true })
        .eq("khatam_id", k.id);

      khatamInfos.push({
        id: k.id,
        khatam_num: k.khatam_num,
        created_at: k.created_at,
        completed_at: k.completed_at,
        done: count ?? 0,
        total: totalCount ?? 120,
      });
    }

    setKhatams(khatamInfos);
    return khatamInfos;
  }, [group]);

  // Load slots for a specific khatam
  const loadSlots = useCallback(async (khatamId: number) => {
    const { data: dbSlots, error } = await supabase
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

  // Initial load + reload when group changes
  useEffect(() => {
    const isGroupChange = lastGroup.current !== group;
    lastGroup.current = group;

    (async () => {
      if (isGroupChange) setLoading(true);
      const infos = await loadKhatams();
      if (infos.length > 0) {
        const latest = infos[0]; // already sorted desc
        setSelectedKhatamId(latest.id);
        setKhatamNum(latest.khatam_num);
        await loadSlots(latest.id);
      } else {
        setSlots([]);
        setKhatams([]);
        setSelectedKhatamId(null);
      }
      setLoading(false);
    })();
  }, [group, loadKhatams, loadSlots]);

  // When user switches khatam
  const selectKhatam = useCallback(async (khatamId: number) => {
    const info = khatams.find(k => k.id === khatamId);
    if (!info) return;
    setSelectedKhatamId(khatamId);
    setKhatamNum(info.khatam_num);
    setAdminSelected(null);
    setModal(null);
    setLoading(true);
    await loadSlots(khatamId);
    setLoading(false);
  }, [khatams, loadSlots]);

  // Realtime subscription — follows selectedKhatamId
  useEffect(() => {
    if (!selectedKhatamId) return;

    const channel = supabase
      .channel(`slots-realtime-${selectedKhatamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "qurankhatam", table: "slots", filter: `khatam_id=eq.${selectedKhatamId}` },
        () => {
          loadSlots(selectedKhatamId);
          loadKhatams();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedKhatamId, loadSlots, loadKhatams]);

  const latestKhatamId = khatams.length > 0 ? khatams[0].id : null;
  const isLatestKhatam = selectedKhatamId === latestKhatamId;

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

    const { error } = await supabase
      .from("slots")
      .update({ status: "cl", claimed_by: name, claimed_at: new Date().toISOString() })
      .eq("khatam_id", selectedKhatamId)
      .eq("juz", juz)
      .eq("q", q)
      .eq("status", "av");

    if (error) return { err: "Failed to claim. Please try again." };

    setModal(null);
    toast.success(`Juz ${juz} ${Q_SHORT[q - 1]} claimed by ${name}`);
    await loadSlots(selectedKhatamId!);
    await loadKhatams();
  };

  const onComplete = async (juz: number, q: number, name: string): Promise<{ err: string } | undefined> => {
    const slot = getSlot(juz, q);
    if (slot.by && name.toLowerCase() !== slot.by.toLowerCase()) return { err: `This was claimed by ${slot.by}. Names don't match.` };

    const { error } = await supabase
      .from("slots")
      .update({ status: "dn", claimed_by: name || slot.by, done_at: new Date().toISOString() })
      .eq("khatam_id", selectedKhatamId)
      .eq("juz", juz)
      .eq("q", q);

    if (error) return { err: "Failed to mark complete. Please try again." };

    setModal(null);
    toast.success(`Barakallahu feek! Juz ${juz} ${Q_SHORT[q - 1]} completed`);
    await loadSlots(selectedKhatamId!);
    await loadKhatams();
  };

  const startNewKhatam = async () => {
    const newNum = khatamNum + 1;
    const { data: newKhatam, error: kErr } = await supabase
      .from("khatams")
      .insert({ khatam_num: newNum, group_name: group })
      .select()
      .single();

    if (kErr || !newKhatam) {
      toast.error("Failed to start new khatam");
      return;
    }

    const freshSlots = Array.from({ length: 120 }, (_, i) => ({
      khatam_id: newKhatam.id,
      juz: Math.floor(i / 4) + 1,
      q: (i % 4) + 1,
    }));

    const { error: sErr } = await supabase.from("slots").insert(freshSlots);
    if (sErr) {
      toast.error("Failed to create slots for new khatam");
      return;
    }

    setAdminSelected(null);
    toast(`Khatam ${newNum} has begun — Bismillah!`);
    const infos = await loadKhatams();
    if (infos.length > 0) {
      setSelectedKhatamId(infos[0].id);
      setKhatamNum(infos[0].khatam_num);
      await loadSlots(infos[0].id);
    }
  };

  const tryAdmin = () => {
    if (adminPw === ADMIN_PW) { setAdminMode(true); setAdminErr(""); toast.success("Admin mode active"); }
    else setAdminErr("Incorrect password");
  };

  const adminSetStatus = async (st: StatusKey) => {
    if (!adminSelected) return;
    const { juz, q } = adminSelected;
    const slot = getSlot(juz, q);

    const updates = st === "av"
      ? { status: "av" as const, claimed_by: null, claimed_at: null, done_at: null }
      : st === "cl"
      ? { status: "cl" as const, claimed_by: slot.by || "Admin", claimed_at: new Date().toISOString() }
      : { status: "dn" as const, claimed_by: slot.by || "Admin", done_at: new Date().toISOString() };

    const { error } = await supabase
      .from("slots")
      .update(updates)
      .eq("khatam_id", selectedKhatamId)
      .eq("juz", juz)
      .eq("q", q);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast(`Set to ${COLORS[st].label}`);
    await loadSlots(selectedKhatamId!);
    await loadKhatams();
  };

  const deactivateAdmin = () => {
    setAdminMode(false);
    setAdminSelected(null);
    toast("Admin mode off");
  };

  return {
    group, slots, khatamNum, khatams, selectedKhatamId, isLatestKhatam,
    loading, modal, setModal,
    adminMode, adminSelected, setAdminSelected,
    adminPw, setAdminPw, adminErr,
    done, prog, rem, pct, khatmComplete,
    getSlot, onBook, onComplete,
    selectKhatam,
    startNewKhatam, tryAdmin, adminSetStatus, deactivateAdmin,
  };
}
