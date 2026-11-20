import { ROOT_ID } from "./data";
import type { Aspect, Folder } from "./types";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const FPS = 25;

export function timecode(sec: number, fps = FPS) {
  const s = Math.max(0, sec || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const f = Math.floor((s - Math.floor(s)) * fps);
  return [h, m, ss, f].map((n) => String(n).padStart(2, "0")).join(":");
}

export function duration(sec: number) {
  const t = Math.round(sec || 0);
  const m = Math.floor(t / 60);
  const s = t % 60;
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
export function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export const brandFolderId = (brandId: string) => `b::${brandId}`;
export const campaignFolderId = (brandId: string, campaign: string) => `c::${brandId}::${campaign}`;

export const childFolders = (folders: Folder[], id: string) => folders.filter((f) => f.parentId === id);
export const folderById = (folders: Folder[], id: string) => folders.find((f) => f.id === id);

export function folderPath(folders: Folder[], id: string): Folder[] {
  const path: Folder[] = [];
  let cur = folderById(folders, id);
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId && cur.parentId !== ROOT_ID ? folderById(folders, cur.parentId) : undefined;
  }
  return path;
}

export function descendantIds(folders: Folder[], id: string): string[] {
  const out = [id];
  for (const f of childFolders(folders, id)) out.push(...descendantIds(folders, f.id));
  return out;
}

export function aspectOf(w?: number | null, h?: number | null): Aspect {
  if (!w || !h) return "16:9";
  const r = w / h;
  if (r < 0.7) return "9:16";
  if (r < 0.9) return "4:5";
  if (r < 1.2) return "1:1";
  return "16:9";
}
export const aspectRatio = (a: Aspect) => ({ "9:16": 9 / 16, "16:9": 16 / 9, "1:1": 1, "4:5": 4 / 5 })[a];

export function formatBytes(n: number) {
  if (n < 1e6) return `${Math.round(n / 1e3)} Ko`;
  if (n < 1e9) return `${(n / 1e6).toFixed(1)} Mo`;
  return `${(n / 1e9).toFixed(2)} Go`;
}
