"use client";

import { SUPABASE_KEY, SUPABASE_URL, supabase } from "./supabase";

export type VideoInfo = { duration: number; width: number | null; height: number | null; thumb: Blob | null };

const once = (el: HTMLElement, ev: string, timeout = 15000) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), timeout);
    el.addEventListener(ev, () => { clearTimeout(t); resolve(); }, { once: true });
    el.addEventListener("error", () => { clearTimeout(t); reject(new Error("decode")); }, { once: true });
  });

/** Lit la durée, les dimensions et capture une miniature dans le navigateur */
export async function analyzeVideo(file: File): Promise<VideoInfo> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.preload = "auto";
  v.muted = true;
  v.playsInline = true;
  v.src = url;
  try {
    await once(v, "loadedmetadata");
    const info: VideoInfo = { duration: v.duration || 0, width: v.videoWidth || null, height: v.videoHeight || null, thumb: null };
    try {
      const scale = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      // On essaie plusieurs instants pour éviter une image noire (fondu d'ouverture, Safari…)
      const d = v.duration || 1;
      for (const t of [Math.min(1.5, d * 0.2), d * 0.35, d * 0.5]) {
        v.currentTime = t;
        await once(v, "seeked");
        await new Promise((r) => setTimeout(r, 120)); // laisse le temps au navigateur d'afficher l'image
        ctx.drawImage(v, 0, 0, c.width, c.height);
        const px = ctx.getImageData(0, 0, c.width, c.height).data;
        let sum = 0;
        for (let i = 0; i < px.length; i += 4 * 97) sum += px[i] + px[i + 1] + px[i + 2];
        if (sum / (px.length / (4 * 97)) / 3 > 12) break; // image assez lumineuse
      }
      info.thumb = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    } catch {
      /* miniature impossible (codec non lu par le navigateur) */
    }
    return info;
  } catch {
    return { duration: 0, width: null, height: null, thumb: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Envoi vers Supabase Storage avec suivi de progression */
export async function uploadWithProgress(bucket: string, path: string, body: Blob, contentType: string, onProgress?: (p: number) => void) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée, reconnectez-vous.");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let msg = `Échec de l'envoi (${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText).message || msg; } catch {}
        if (/size|exceed|too large/i.test(msg)) msg = "Fichier trop lourd (50 Mo maximum).";
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Connexion interrompue pendant l'envoi."));
    xhr.send(body);
  });
}

export const extOf = (name: string) => (name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
