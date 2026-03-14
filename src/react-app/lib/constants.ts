import type { StatusKey, StatusColor } from "./types";

export const JUZ_NAMES = [
  "Alif Lam Mim","Sayaqul","Tilkar Rusul","Lan Tana Lu","Wal Muhsanat",
  "La Yuhibbullah","Wa Idha Sami'u","Wa Law Annana","Qalal Mala'u","Wa'lamu",
  "Ya'tadhiruna","Wa Ma Min Dabbah","Wa Ma Ubarri'u","Rubama","Subhanallad\u0331i",
  "Qala Alam","Iqtaraba","Qad Aflaha","Wa Qalallad\u0331ina","Amman Khalaq",
  "Utlu Ma Uhiya","Wa Man Yaqnut","Wa Ma Liya","Faman Azlam","Ilayhi Yuraddu",
  "Ha Mim","Qala Fama Khatbukum","Qad Sami'allah","Tabarak","'Amma"
];

export const Q_LABELS = ["1st Quarter","2nd Quarter","3rd Quarter","4th Quarter"];
export const Q_SHORT = ["Q1","Q2","Q3","Q4"];
export const ADMIN_PW = "quran2025";

export const COLORS: Record<StatusKey, StatusColor> = {
  av: { bg:"#FFFFFF", border:"#E0E0E0", text:"#4A4A4A", accent:"#8B0000", accentBg:"#FFF5F5", label:"Available" },
  cl: { bg:"#FFFDE7", border:"#F9A825", text:"#5D4037", accent:"#F57F17", accentBg:"#FFF8E1", label:"In Progress" },
  dn: { bg:"#E8F5E9", border:"#2E7D32", text:"#1B5E20", accent:"#2E7D32", accentBg:"#C8E6C9", label:"Completed" },
};
