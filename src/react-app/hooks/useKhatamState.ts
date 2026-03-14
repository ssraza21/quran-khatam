import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { Slot, StatusKey } from "@/lib/types";
import { Q_SHORT, COLORS, ADMIN_PW } from "@/lib/constants";
import { makeDummySlots } from "@/lib/helpers";

export function useKhatamState() {
  const [slots, setSlots] = useState<Slot[]>(makeDummySlots);
  const [khatamNum, setKhatamNum] = useState(1);
  const [modal, setModal] = useState<{ juz: number; q: number } | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminSelected, setAdminSelected] = useState<{ juz: number; q: number } | null>(null);
  const [adminPw, setAdminPw] = useState("");
  const [adminErr, setAdminErr] = useState("");

  const getSlot = useCallback((juz: number, q: number) => slots.find(s => s.juz === juz && s.q === q)!, [slots]);
  const countActive = useCallback((name: string) => slots.filter(s => s.by === name && s.status === "cl").length, [slots]);

  const done = slots.filter(s => s.status === "dn").length;
  const prog = slots.filter(s => s.status === "cl").length;
  const rem = 120 - done - prog;
  const pct = Math.round((done / 120) * 100);
  const khatmComplete = done === 120;

  const updateSlot = (juz: number, q: number, updates: Partial<Slot>) => {
    setSlots(prev => prev.map(s => s.juz === juz && s.q === q ? { ...s, ...updates } : s));
  };

  const onBook = (juz: number, q: number, name: string): { err: string } | undefined => {
    const slot = getSlot(juz, q);
    if (slot.status !== "av") return { err: "This quarter was just claimed. Please choose another." };
    if (countActive(name) >= 8) return { err: "You've reached the limit of 8 quarters. Complete your current portions first." };
    updateSlot(juz, q, { status: "cl", by: name, at: new Date().toISOString(), done_at: null });
    setModal(null);
    toast.success(`Juz ${juz} ${Q_SHORT[q - 1]} claimed by ${name}`);
  };

  const onComplete = (juz: number, q: number, name: string): { err: string } | undefined => {
    const slot = getSlot(juz, q);
    if (slot.by && name.toLowerCase() !== slot.by.toLowerCase()) return { err: `This was claimed by ${slot.by}. Names don't match.` };
    updateSlot(juz, q, { status: "dn", by: name || slot.by, done_at: new Date().toISOString() });
    setModal(null);
    toast.success(`Barakallahu feek! Juz ${juz} ${Q_SHORT[q - 1]} completed`);
  };

  const startNewKhatam = () => {
    setKhatamNum(k => k + 1);
    setSlots(Array.from({ length: 120 }, (_, i) => ({
      juz: Math.floor(i / 4) + 1, q: (i % 4) + 1, status: "av" as StatusKey,
      by: null, at: null, done_at: null
    })));
    setAdminSelected(null);
    toast(`Khatam ${khatamNum + 1} has begun — Bismillah!`);
  };

  const tryAdmin = () => {
    if (adminPw === ADMIN_PW) { setAdminMode(true); setAdminErr(""); toast.success("Admin mode active"); }
    else setAdminErr("Incorrect password");
  };

  const adminSetStatus = (st: StatusKey) => {
    if (!adminSelected) return;
    const { juz, q } = adminSelected;
    const slot = getSlot(juz, q);
    const updates: Partial<Slot> = st === "av" ? { status: "av", by: null, at: null, done_at: null }
      : st === "cl" ? { status: "cl", by: slot.by || "Admin", at: new Date().toISOString() }
      : { status: "dn", by: slot.by || "Admin", done_at: new Date().toISOString() };
    updateSlot(juz, q, updates);
    toast(`Set to ${COLORS[st].label}`);
  };

  const deactivateAdmin = () => {
    setAdminMode(false);
    setAdminSelected(null);
    toast("Admin mode off");
  };

  return {
    slots, khatamNum, modal, setModal,
    adminMode, adminSelected, setAdminSelected,
    adminPw, setAdminPw, adminErr,
    done, prog, rem, pct, khatmComplete,
    getSlot, onBook, onComplete,
    startNewKhatam, tryAdmin, adminSetStatus, deactivateAdmin,
  };
}
