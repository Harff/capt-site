import type { Status, User } from "./types";

export const ROOT_ID = "root";

export const STATUS_META: Record<Status, { label: string; bg: string; fg: string; dot: string }> = {
  requires_validation: { label: "Requiert validation", bg: "rgba(127,214,160,0.16)", fg: "#7fd6a0", dot: "#4fbf80" },
  needs_review: { label: "À sous-titrer", bg: "rgba(239,106,71,0.16)", fg: "#ff9b80", dot: "#ef6a47" },
  changes: { label: "Modifications requises", bg: "rgba(139,107,230,0.18)", fg: "#bba6ff", dot: "#9a7cf0" },
  approved: { label: "Approuvé", bg: "rgba(79,130,234,0.18)", fg: "#9dbbff", dot: "#5b8cf0" },
};
/** Tag affiché à la place du statut pendant qu'un traitement automatique tourne */
export const RUNNING_META = { label: "En cours", bg: "rgba(227,154,45,0.16)", fg: "#f4bb63", dot: "#e8a23a" };

export const STATUS_ORDER: Status[] = ["requires_validation", "needs_review", "changes", "approved"];

const PALETTE: [string, string][] = [
  ["#3a2420", "#ff9b80"],
  ["#1e2a40", "#9dbbff"],
  ["#1d3326", "#7fd6a0"],
  ["#2e2440", "#bba6ff"],
  ["#3a3020", "#f4bb63"],
  ["#1c3236", "#78d2df"],
];

export function makeUser(id: string, email: string, fullName?: string | null): User {
  const name = (fullName && fullName.trim()) || email.split("@")[0];
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = PALETTE[h % PALETTE.length];
  return { id, email, name, initials, bg, fg };
}

export const AI_USER: User = { id: "ia", email: "", name: "Assistant IA", initials: "IA", bg: "#1f2a44", fg: "#9db8ff" };
export const UNKNOWN_USER: User = { id: "?", email: "", name: "Anonyme", initials: "?", bg: "#262626", fg: "#9a9d9d" };
