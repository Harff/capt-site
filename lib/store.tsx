"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { AI_USER, makeUser, ROOT_ID, UNKNOWN_USER } from "./data";
import { analyzeVideo, extOf, uploadWithProgress } from "./media";
import { MAX_UPLOAD_BYTES, supabase } from "./supabase";
import type { Asset, Brand, Comment, Folder, Status, User, Version } from "./types";
import { aspectOf, brandFolderId, campaignFolderId } from "./utils";
import { buildCaptionStyle, buildSkillMd, type CaptionChoices } from "./captionStyle";

type Toast = { id: number; text: string; error?: boolean };

type Store = {
  session: Session | null;
  authReady: boolean;
  me: User | null;
  /** true tant que la personne n'a pas indiqué son prénom */
  needsName: boolean;
  loading: boolean;
  users: User[];
  userById: (id: string | null | undefined) => User;
  brands: Brand[];
  folders: Folder[];
  assets: Asset[];
  comments: Comment[];
  toasts: Toast[];
  toast: (text: string, error?: boolean) => void;
  refresh: () => Promise<void>;
  getAsset: (id: string) => Asset | undefined;
  setStatus: (ids: string[], status: Status) => Promise<void>;
  /** Demande à l'assistant IA d'appliquer les commentaires non résolus et de régénérer la vidéo */
  regenerate: (assetId: string) => Promise<void>;
  unresolvedCount: (assetId: string) => number;
  approve: (assetId: string, version: number) => Promise<void>;
  revokeApproval: (assetId: string, version: number) => Promise<void>;
  addComment: (c: { assetId: string; version: number; time: number | null; text: string; x?: number; y?: number }) => Promise<string | null>;
  addReply: (commentId: string, text: string) => Promise<void>;
  toggleResolved: (commentId: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  editComment: (commentId: string, text: string) => Promise<void>;
  createBrand: (name: string, captionChoices?: CaptionChoices) => Promise<Brand | null>;
  createVideo: (input: { brandId: string; campaign: string | null; title: string; file: File; onProgress?: (p: number) => void }) => Promise<string>;
  addVersion: (input: { assetId: string; file: File; note: string | null; onProgress?: (p: number) => void }) => Promise<number>;
  deleteVideo: (assetId: string) => Promise<void>;
  setThumbnail: (assetId: string, version: number, image: Blob) => Promise<void>;
  signedVideoUrl: (path: string) => Promise<string | null>;
  /** Supprime une version (fichier, miniature, commentaires et approbation de cette version) */
  deleteVersion: (assetId: string, version: number) => Promise<boolean>;
  /** Télécharge le fichier d'une version (la dernière par défaut) */
  downloadVersion: (assetId: string, version?: number) => Promise<void>;
  updateMyName: (name: string) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

/* Lignes brutes renvoyées par Supabase */
type VideoRow = { id: string; brand_id: string; campaign: string | null; title: string; status: Status; regen_state: string | null; due_at: string | null; created_by: string | null; created_at: string; updated_at: string };
type VersionRow = { id: string; video_id: string; number: number; storage_path: string; thumb_path: string | null; duration: number | null; width: number | null; height: number | null; note: string | null; uploaded_by: string | null; subtitle_state: string | null; created_at: string };
type CommentRow = { id: string; video_id: string; version: number; parent_id: string | null; author_id: string | null; time_sec: number | null; x: number | null; y: number | null; body: string; resolved: boolean; created_at: string };
type ApprovalRow = { video_id: string; version: number; user_id: string };

const SIGN_TTL = 6 * 3600;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [myName, setMyName] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const signed = useRef(new Map<string, { url: string; exp: number }>());

  const toast = useCallback((text: string, error?: boolean) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, text, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), error ? 5000 : 2600);
  }, []);

  /* ---------------- Authentification ---------------- */
  useEffect(() => {
    // Accès libre : chaque navigateur reçoit automatiquement une session anonyme
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setSession(data.session);
        setAuthReady(true);
        return;
      }
      const res = await supabase.auth.signInAnonymously();
      if (res.error) toast(`Connexion impossible : ${res.error.message}`, true);
      setSession(res.data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, [toast]);

  const myId = session?.user.id ?? null;

  /* ---------------- Chargement des données ---------------- */
  const signThumbs = async (paths: string[]) => {
    const now = Date.now();
    const missing = paths.filter((p) => {
      const c = signed.current.get(p);
      return !c || c.exp < now + 60_000;
    });
    if (missing.length) {
      const { data } = await supabase.storage.from("thumbnails").createSignedUrls(missing, SIGN_TTL);
      data?.forEach((d) => d.path && d.signedUrl && signed.current.set(d.path, { url: d.signedUrl, exp: now + SIGN_TTL * 1000 }));
    }
  };

  const refresh = useCallback(async () => {
    if (!myId) return;
    const [p, b, v, ver, c, a] = await Promise.all([
      supabase.from("profiles").select("id,full_name,created_at").order("created_at"),
      supabase.from("brands").select("id,name").order("name"),
      supabase.from("videos").select("id,brand_id,campaign,title,status,regen_state,due_at,created_by,created_at,updated_at").order("updated_at", { ascending: false }),
      supabase.from("video_versions").select("id,video_id,number,storage_path,thumb_path,duration,width,height,note,uploaded_by,subtitle_state,created_at").order("number"),
      supabase.from("comments").select("id,video_id,version,parent_id,author_id,time_sec,x,y,body,resolved,created_at").order("created_at"),
      supabase.from("approvals").select("video_id,version,user_id"),
    ]);
    const err = [p, b, v, ver, c, a].find((r) => r.error)?.error;
    if (err) {
      toast(`Erreur de chargement : ${err.message}`, true);
      setLoading(false);
      return;
    }

    const profiles = (p.data ?? []) as { id: string; full_name: string | null }[];
    setMyName(profiles.find((x) => x.id === myId)?.full_name?.trim() || null);
    const userList = profiles.filter((r) => r.full_name?.trim()).map((r) => makeUser(r.id, "", r.full_name));
    const brandList = (b.data ?? []) as Brand[];
    const versions = (ver.data ?? []) as VersionRow[];
    await signThumbs(versions.map((x) => x.thumb_path).filter(Boolean) as string[]);

    const approvals = (a.data ?? []) as ApprovalRow[];
    const userIds = userList.map((u) => u.id);

    const assetList: Asset[] = ((v.data ?? []) as VideoRow[]).map((row) => {
      const vs: Version[] = versions
        .filter((x) => x.video_id === row.id)
        .map((x) => ({
          id: x.id,
          v: x.number,
          path: x.storage_path,
          thumbPath: x.thumb_path,
          thumb: x.thumb_path ? signed.current.get(x.thumb_path)?.url ?? null : null,
          duration: Number(x.duration ?? 0),
          width: x.width,
          height: x.height,
          uploadedAt: x.created_at,
          uploadedBy: x.uploaded_by,
          note: x.note,
        }));
      const latest = vs[vs.length - 1];
      const latestRow = versions.filter((x) => x.video_id === row.id).at(-1);
      const busy = (s: string | null | undefined) => s === "pending" || s === "taken";
      const brand = brandList.find((x) => x.id === row.brand_id);
      return {
        id: row.id,
        title: row.title,
        brandId: row.brand_id,
        brandName: brand?.name ?? "—",
        campaign: row.campaign,
        folderId: row.campaign ? campaignFolderId(row.brand_id, row.campaign) : brandFolderId(row.brand_id),
        duration: latest?.duration ?? 0,
        aspect: aspectOf(latest?.width, latest?.height),
        thumb: latest?.thumb ?? null,
        status: row.status,
        regenState: row.regen_state ?? null,
        running: busy(latestRow?.subtitle_state) || busy(row.regen_state),
        versions: vs,
        reviewers: userIds,
        approvedBy: latest ? approvals.filter((x) => x.video_id === row.id && x.version === latest.v).map((x) => x.user_id) : [],
        updatedAt: row.updated_at,
        createdAt: row.created_at,
        createdBy: row.created_by,
        dueAt: row.due_at,
      };
    });

    const rows = (c.data ?? []) as CommentRow[];
    const commentList: Comment[] = rows
      .filter((r) => !r.parent_id)
      .map((r) => ({
        id: r.id,
        assetId: r.video_id,
        version: r.version,
        authorId: r.author_id ?? "ia",
        time: r.time_sec === null ? null : Number(r.time_sec),
        x: r.x === null ? undefined : Number(r.x),
        y: r.y === null ? undefined : Number(r.y),
        text: r.body,
        createdAt: r.created_at,
        resolved: r.resolved,
        replies: rows
          .filter((x) => x.parent_id === r.id)
          .map((x) => ({ id: x.id, authorId: x.author_id ?? "ia", text: x.body, createdAt: x.created_at })),
      }));

    setUsers(userList);
    setBrands(brandList);
    setAssets(assetList);
    setComments(commentList);
    setLoading(false);
  }, [myId, toast]);

  useEffect(() => {
    if (!myId) return;
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    // Temps réel : les vidéos, versions et commentaires des autres apparaissent sans recharger la page
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refresh(), 400);
    };
    const channel = supabase.channel("capt-live");
    for (const table of ["videos", "video_versions", "comments", "approvals", "brands", "profiles"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, soon);
    }
    channel.subscribe();
    // Filet de sécurité : rafraîchit toutes les 20 s quand l'onglet est visible (changements faits par l'automatisation)
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 20_000);

    return () => {
      window.removeEventListener("focus", onFocus);
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [myId, refresh]);

  /* ---------------- Arborescence : marques › campagnes ---------------- */
  const folders = useMemo<Folder[]>(() => {
    const out: Folder[] = [];
    for (const b of brands) {
      out.push({ id: brandFolderId(b.id), name: b.name, parentId: ROOT_ID, brandId: b.id, campaign: null });
      const camps = [...new Set(assets.filter((a) => a.brandId === b.id && a.campaign).map((a) => a.campaign!))].sort((x, y) =>
        x.localeCompare(y, "fr", { numeric: true })
      );
      for (const c of camps) out.push({ id: campaignFolderId(b.id, c), name: c, parentId: brandFolderId(b.id), brandId: b.id, campaign: c });
    }
    return out;
  }, [brands, assets]);

  /* ---------------- Actions ---------------- */
  const run = async (p: PromiseLike<{ error: { message: string } | null }>, okMsg?: string) => {
    const { error } = await p;
    if (error) {
      toast(error.message, true);
      return false;
    }
    if (okMsg) toast(okMsg);
    return true;
  };

  const me = useMemo(() => users.find((u) => u.id === myId) ?? (myId ? makeUser(myId, "", myName || "Invité") : null), [users, myId, myName]);

  const value: Store = {
    session,
    authReady,
    me,
    needsName: myName === null,
    loading,
    users,
    userById: (id) => (id === "ia" ? AI_USER : users.find((u) => u.id === id) ?? UNKNOWN_USER),
    brands,
    folders,
    assets,
    comments,
    toasts,
    toast,
    refresh,
    getAsset: (id) => assets.find((a) => a.id === id),

    unresolvedCount: (assetId) => comments.filter((c) => c.assetId === assetId && !c.resolved).length,

    regenerate: async (assetId) => {
      const n = comments.filter((c) => c.assetId === assetId && !c.resolved).length;
      if (!n) return toast("Aucun commentaire à appliquer.", true);
      setAssets((l) => l.map((a) => (a.id === assetId ? { ...a, status: "changes", regenState: "pending", running: true } : a)));
      if (await run(supabase.from("videos").update({ status: "changes", regen_state: "pending" }).eq("id", assetId))) {
        toast("Régénération lancée : l'assistant applique les commentaires.");
      }
      refresh();
    },

    setStatus: async (ids, status) => {
      if (status === "approved" && ids.some((id) => comments.some((c) => c.assetId === id && !c.resolved))) {
        return toast("Impossible de valider : des commentaires ne sont pas résolus.", true);
      }
      setAssets((l) => l.map((a) => (ids.includes(a.id) ? { ...a, status } : a)));
      await run(supabase.from("videos").update({ status }).in("id", ids));
      refresh();
    },

    approve: async (assetId, version) => {
      if (comments.some((c) => c.assetId === assetId && !c.resolved)) {
        return toast("Impossible de valider : des commentaires ne sont pas résolus. Régénérez la vidéo ou résolvez-les.", true);
      }
      if (!(await run(supabase.from("approvals").upsert({ video_id: assetId, version, user_id: myId }, { onConflict: "video_id,version", ignoreDuplicates: true })))) return;
      await run(supabase.from("videos").update({ status: "approved" }).eq("id", assetId));
      await refresh();
    },

    revokeApproval: async (assetId, version) => {
      // Une seule approbation par vidéo : n'importe qui peut l'annuler
      await run(supabase.from("approvals").delete().match({ video_id: assetId, version }));
      await run(supabase.from("videos").update({ status: "needs_review" }).eq("id", assetId));
      await refresh();
    },

    addComment: async ({ assetId, version, time, text, x, y }) => {
      const { data, error } = await supabase
        .from("comments")
        .insert({ video_id: assetId, version, time_sec: time, x: x ?? null, y: y ?? null, body: text, author_id: myId })
        .select("id")
        .single();
      if (error) {
        toast(error.message, true);
        return null;
      }
      const a = assets.find((x) => x.id === assetId);
      if (a?.status === "approved") await supabase.from("videos").update({ status: "changes" }).eq("id", assetId);
      await refresh();
      return data.id as string;
    },

    addReply: async (commentId, text) => {
      const parent = comments.find((c) => c.id === commentId);
      if (!parent) return;
      await run(
        supabase.from("comments").insert({ video_id: parent.assetId, version: parent.version, parent_id: commentId, body: text, author_id: myId })
      );
      await refresh();
    },

    toggleResolved: async (commentId) => {
      const c = comments.find((x) => x.id === commentId);
      if (!c) return;
      setComments((l) => l.map((x) => (x.id === commentId ? { ...x, resolved: !x.resolved } : x)));
      await run(supabase.from("comments").update({ resolved: !c.resolved }).eq("id", commentId));
      refresh();
    },

    deleteComment: async (commentId) => {
      await run(supabase.from("comments").delete().eq("id", commentId), "Commentaire supprimé");
      await refresh();
    },

    editComment: async (commentId, text) => {
      await run(supabase.from("comments").update({ body: text }).eq("id", commentId));
      await refresh();
    },

    createBrand: async (name, captionChoices) => {
      const clean = name.trim();
      const existing = brands.find((b) => b.name.toLowerCase() === clean.toLowerCase());
      if (existing) return existing;
      // Avec un style : n8n le recopie dans la table Clients du robot (style_sync = pending) avant le premier traitement.
      const row: Record<string, unknown> = captionChoices
        ? { name: clean, style: { style: buildCaptionStyle(clean, captionChoices), skill_md: buildSkillMd(clean, captionChoices) }, style_sync: "pending" }
        : { name: clean };
      const { data, error } = await supabase.from("brands").insert(row).select("id,name").single();
      if (error) {
        toast(error.message, true);
        return null;
      }
      toast(`Marque « ${clean} » créée`);
      await refresh();
      return data as Brand;
    },

    createVideo: async ({ brandId, campaign, title, file, onProgress }) => {
      if (file.size > MAX_UPLOAD_BYTES) throw new Error("Fichier trop lourd : 50 Mo maximum par vidéo.");
      const info = await analyzeVideo(file);
      const { data, error } = await supabase
        .from("videos")
        .insert({ brand_id: brandId, campaign: campaign?.trim() || null, title: title.trim(), status: "needs_review", aspect: aspectOf(info.width, info.height) })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const id = data.id as string;
      try {
        await uploadVersionFiles(id, 1, file, info, null, onProgress, true);
      } catch (e) {
        await supabase.from("videos").delete().eq("id", id);
        throw e;
      }
      await refresh();
      return id;
    },

    addVersion: async ({ assetId, file, note, onProgress }) => {
      if (file.size > MAX_UPLOAD_BYTES) throw new Error("Fichier trop lourd : 50 Mo maximum par vidéo.");
      const a = assets.find((x) => x.id === assetId);
      const n = (a?.versions.at(-1)?.v ?? 0) + 1;
      const info = await analyzeVideo(file);
      await uploadVersionFiles(assetId, n, file, info, note, onProgress);
      await supabase.from("videos").update({ status: "needs_review" }).eq("id", assetId);
      await refresh();
      return n;
    },

    deleteVideo: async (assetId) => {
      const a = assets.find((x) => x.id === assetId);
      if (!a) return;
      const vids = a.versions.map((v) => v.path);
      const thumbs = a.versions.map((v) => v.thumbPath).filter(Boolean) as string[];
      if (vids.length) await supabase.storage.from("videos").remove(vids);
      if (thumbs.length) await supabase.storage.from("thumbnails").remove(thumbs);
      await run(supabase.from("videos").delete().eq("id", assetId), "Vidéo supprimée");
      await refresh();
    },

    setThumbnail: async (assetId, version, image) => {
      const a = assets.find((x) => x.id === assetId);
      const v = a?.versions.find((x) => x.v === version);
      if (!a || !v) return;
      const path = `${assetId}/v${version}-${Date.now()}.jpg`;
      try {
        await uploadWithProgress("thumbnails", path, image, "image/jpeg");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Échec de l'envoi", true);
        return;
      }
      if (await run(supabase.from("video_versions").update({ thumb_path: path }).eq("id", v.id), "Miniature mise à jour")) {
        if (v.thumbPath) await supabase.storage.from("thumbnails").remove([v.thumbPath]);
      }
      await refresh();
    },

    signedVideoUrl: async (path) => {
      const { data, error } = await supabase.storage.from("videos").createSignedUrl(path, SIGN_TTL);
      if (error) {
        toast(error.message, true);
        return null;
      }
      return data.signedUrl;
    },

    deleteVersion: async (assetId, version) => {
      const a = assets.find((x) => x.id === assetId);
      const v = a?.versions.find((x) => x.v === version);
      if (!a || !v) return false;
      if (a.versions.length <= 1) {
        toast("C'est la seule version : supprimez plutôt la vidéo.", true);
        return false;
      }
      if (a.status === "approved" && v.v === a.versions[a.versions.length - 1].v) {
        toast("Cette version est approuvée : annulez d'abord l'approbation.", true);
        return false;
      }
      const r = await supabase.storage.from("videos").remove([v.path]);
      if (r.error) {
        toast(`Version non supprimée : ${r.error.message}`, true);
        return false;
      }
      if (v.thumbPath) await supabase.storage.from("thumbnails").remove([v.thumbPath]);
      // Les commentaires de cette version disparaîtraient de l'écran : on les supprime avec elle
      await supabase.from("comments").delete().eq("video_id", assetId).eq("version", version);
      await supabase.from("approvals").delete().eq("video_id", assetId).eq("version", version);
      const ok = await run(supabase.from("video_versions").delete().eq("id", v.id), `V${version} supprimée`);
      await refresh();
      return ok;
    },

    downloadVersion: async (assetId, version) => {
      const a = assets.find((x) => x.id === assetId);
      const v = a?.versions.find((x) => x.v === version) ?? a?.versions[a.versions.length - 1];
      if (!a || !v) return toast("Aucun fichier à télécharger", true);
      const ext = v.path.split(".").pop() || "mp4";
      const name = `${a.title} V${v.v}.${ext}`.replace(/[\\/:*?"<>|]+/g, "-");
      // Lien signé qui force le téléchargement (au lieu d'ouvrir la vidéo dans un onglet)
      const { data, error } = await supabase.storage.from("videos").createSignedUrl(v.path, 600, { download: name });
      if (error || !data) return toast(error?.message ?? "Téléchargement impossible", true);
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast(`Téléchargement de « ${a.title} » V${v.v}`);
    },

    updateMyName: async (name) => {
      if (!myId) return;
      await run(supabase.from("profiles").upsert({ id: myId, full_name: name.trim() }));
      await refresh();
    },

  };

  async function uploadVersionFiles(
    videoId: string,
    n: number,
    file: File,
    info: Awaited<ReturnType<typeof analyzeVideo>>,
    note: string | null,
    onProgress?: (p: number) => void,
    pendingSubtitles = false
  ) {
    const path = `${videoId}/v${n}-${Date.now()}.${extOf(file.name)}`;
    await uploadWithProgress("videos", path, file, file.type || "video/mp4", onProgress);
    let thumbPath: string | null = null;
    if (info.thumb) {
      thumbPath = `${videoId}/v${n}-${Date.now()}.jpg`;
      try {
        await uploadWithProgress("thumbnails", thumbPath, info.thumb, "image/jpeg");
      } catch {
        thumbPath = null;
      }
    }
    const { error } = await supabase.from("video_versions").insert({
      video_id: videoId,
      number: n,
      storage_path: path,
      thumb_path: thumbPath,
      duration: info.duration || null,
      width: info.width,
      height: info.height,
      size_bytes: file.size,
      note,
      uploaded_by: myId,
      subtitle_state: pendingSubtitles ? "pending" : null,
    });
    if (error) {
      await supabase.storage.from("videos").remove([path]);
      throw new Error(error.message);
    }
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return s;
}
