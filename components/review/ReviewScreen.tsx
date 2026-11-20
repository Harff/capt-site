"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Captions,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Info,
  Keyboard,
  Maximize,
  MessageSquare,
  Minimize,
  Activity as ActivityIcon,
  Pause,
  PenOff,
  PenLine,
  Play,
  Repeat,
  RotateCcw,
  Share2,
  Trash2,
  ImageIcon,
  Upload,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Avatar, AvatarStack } from "@/components/Avatar";
import { Spinner } from "@/components/Common";
import { Dropdown, MenuItem } from "@/components/Dropdown";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_META } from "@/lib/data";
import { useUpload } from "@/components/UploadModal";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Asset, Comment } from "@/lib/types";
import { aspectRatio, cn, FPS, timeAgo, timecode } from "@/lib/utils";
import { CommentsPanel, type CommentsPanelHandle, ReplyBox } from "./CommentsPanel";
import { ShareModal } from "./ShareModal";
import { ActivityPanel, InfoPanel, VersionsPanel } from "./SidePanels";
import { Timeline } from "./Timeline";

type Panel = "info" | "comments" | "activity" | "versions";
type Draft = { time: number; x?: number; y?: number };

const SPEEDS = [0.5, 1, 1.5, 2];
/** Sous-titres fictifs (bouton CC) */
const SUBS = ["Bon… on est lundi.", "Et c'est mon premier jour dans l'entreprise.", "Premier réflexe : trouver la machine à café.", "Deuxième réflexe : retenir les prénoms.", "Spoiler : j'ai raté les deux."];

export function ReviewScreen({ asset }: { asset: Asset }) {
  const store = useStore();
  const { comments: all, addComment, addReply, toggleResolved, approve, revokeApproval, setStatus, regenerate, unresolvedCount, toast, userById, me: meUser, signedVideoUrl, deleteVideo, setThumbnail, downloadVersion } = store;
  const upload = useUpload();
  const router = useRouter();

  const [version, setVersion] = useState(asset.versions.at(-1)?.v ?? 1);
  const v = asset.versions.find((x) => x.v === version) ?? asset.versions[asset.versions.length - 1];

  // Lien sécurisé (temporaire) vers le fichier vidéo
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    setSrc(null);
    signedVideoUrl(v.path).then((u) => !off && setSrc(u));
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.path]);

  // Nouvelle version importée : on l'affiche automatiquement
  const latestV = asset.versions.at(-1)?.v ?? 1;
  const prevLatest = useRef(latestV);
  useEffect(() => {
    if (latestV !== prevLatest.current) {
      prevLatest.current = latestV;
      setVersion(latestV);
    }
  }, [latestV]);
  useEffect(() => {
    if (asset.versions.length && !asset.versions.some((x) => x.v === version)) setVersion(latestV);
  }, [asset.versions, version, latestV]);
  const comments = useMemo(() => all.filter((c) => c.assetId === asset.id && c.version === version), [all, asset.id, version]);
  const assetComments = useMemo(() => all.filter((c) => c.assetId === asset.id), [all, asset.id]);

  /* ---------------- Lecteur ---------------- */
  const video = useRef<HTMLVideoElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [hd, setHd] = useState(true);
  const [cc, setCc] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);

  const [panel, setPanel] = useState<Panel>("comments");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const panelRef = useRef<CommentsPanelHandle>(null);

  // Position fluide pendant la lecture
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      if (video.current) setCurrent(video.current.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Changement de version : on repart de zéro
  useEffect(() => {
    setCurrent(0);
    setPlaying(false);
    setActiveId(null);
    setDraft(null);
    setError(false);
    // Les métadonnées ont pu se charger avant l'hydratation React
    const el = video.current;
    if (el && el.readyState >= 1) setDur(el.duration);
    else setDur(0);
  }, [version]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.playbackRate = speed;
    el.volume = volume;
    el.muted = muted;
    el.loop = loop;
  }, [speed, volume, muted, loop, version]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const seek = useCallback((t: number) => {
    const el = video.current;
    const d = el?.duration || 0;
    const nt = Math.max(0, Math.min(d || t, t));
    if (el) el.currentTime = nt;
    setCurrent(nt);
  }, []);

  const pause = () => video.current?.pause();
  const togglePlay = useCallback(() => {
    const el = video.current;
    if (!el) return;
    if (el.paused) {
      setDraft(null);
      setActiveId(null);
      el.play().catch(() => setError(true));
    } else el.pause();
  }, []);

  const step = useCallback((frames: number) => {
    pause();
    seek((video.current?.currentTime ?? 0) + frames / FPS);
  }, [seek]);

  const timed = useMemo(() => comments.filter((c) => c.time !== null).sort((a, b) => a.time! - b.time!), [comments]);
  const jumpComment = (dir: 1 | -1) => {
    const t = video.current?.currentTime ?? current;
    const target = dir === 1 ? timed.find((c) => c.time! > t + 0.05) : [...timed].reverse().find((c) => c.time! < t - 0.05);
    if (target) selectComment(target);
  };

  const selectComment = (c: Comment) => {
    pause();
    setDraft(null);
    setActiveId(c.id);
    setPanel("comments");
    if (c.time !== null) seek(c.time);
  };

  const startDraftAt = (time: number, xy?: { x: number; y: number }) => {
    pause();
    seek(time);
    setActiveId(null);
    setPanel("comments");
    setDraft({ time, ...xy });
    if (!xy) setTimeout(() => panelRef.current?.focusComposer(), 30);
  };

  const submit = async (text: string, time: number | null, xy?: { x?: number; y?: number }) => {
    setDraft(null);
    const id = await addComment({ assetId: asset.id, version, time, text, x: xy?.x, y: xy?.y });
    if (id) setActiveId(id);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else shell.current?.requestFullscreen?.();
  };

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          e.shiftKey ? seek((video.current?.currentTime ?? 0) - 1) : step(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          e.shiftKey ? seek((video.current?.currentTime ?? 0) + 1) : step(1);
          break;
        case "c":
          e.preventDefault();
          startDraftAt(video.current?.currentTime ?? 0);
          break;
        case "m":
          setMuted((m) => !m);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "Escape":
          setDraft(null);
          setActiveId(null);
          break;
        case "?":
          setHelpOpen((h) => !h);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, step, seek]);

  /* ---------------- Cadre vidéo (taille calculée) ---------------- */
  const stage = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const ratio = aspectRatio(asset.aspect);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const W = e.contentRect.width;
      const H = e.contentRect.height;
      const w = Math.min(W, H * ratio);
      setBox({ w, h: w / ratio });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);

  // Épingles visibles : commentaire actif, ou commentaires proches du timecode courant (en pause)
  const pins = comments.filter(
    (c) => c.x !== undefined && c.time !== null && (c.id === activeId || (!playing && Math.abs(c.time - current) < 0.2))
  );
  const activeComment = comments.find((c) => c.id === activeId);

  const me = meUser?.id ?? "";
  // Une seule approbation par vidéo : dès qu'une personne approuve, c'est validé pour tout le monde
  const iApproved = asset.status === "approved";
  const approverName = asset.approvedBy[0] ? userById(asset.approvedBy[0]).name : null;
  const open = unresolvedCount(asset.id);
  const regenerating = asset.regenState === "pending" || asset.regenState === "taken";
  const crumbs = [asset.brandName, asset.campaign].filter(Boolean) as string[];

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface">
      {/* ============ Barre supérieure ============ */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-2 lg:h-[60px] lg:flex-nowrap lg:gap-3 lg:px-4 lg:py-0">
        <Link href={`/projects?f=${asset.folderId}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-3 hover:text-ink" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="hidden h-6 w-px bg-line sm:block" />

        {/* Sélecteur de version */}
        <Dropdown
          trigger={(_, t) => (
            <button onClick={t} className="flex h-8 items-center gap-1 rounded-md bg-field px-2 text-[13px] font-bold text-ink hover:bg-line">
              V{version} <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
          panelClassName="w-[300px] max-w-[calc(100vw-24px)]"
        >
          {(close) => (
            <>
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Versions</p>
              {[...asset.versions].reverse().map((x) => {
                const n = assetComments.filter((c) => c.version === x.v).length;
                return (
                  <button
                    key={x.v}
                    onClick={() => { setVersion(x.v); close(); }}
                    className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-surface-3", x.v === version && "bg-field")}
                  >
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-bold", x.v === version ? "bg-white text-black" : "bg-surface text-ink ring-1 ring-line")}>
                      V{x.v}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">{x.note}</span>
                      <span className="block text-xs text-ink-muted">
                        {timeAgo(x.uploadedAt)} · {n} commentaire{n > 1 ? "s" : ""}
                      </span>
                    </span>
                    {x.v === version && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
              <div className="my-1 h-px bg-line" />
              <MenuItem icon={<Upload className="h-3.5 w-3.5" />} onClick={() => { upload.open({ assetId: asset.id }); close(); }}>Importer une nouvelle version</MenuItem>
              <MenuItem icon={<History className="h-3.5 w-3.5" />} onClick={() => { setPanel("versions"); close(); }}>Gérer / supprimer des versions</MenuItem>
            </>
          )}
        </Dropdown>

        <div className="min-w-0 flex-1 lg:flex-none">
          <h1 className="truncate text-[15px] font-bold text-ink">{asset.title}</h1>
          <p className="truncate text-xs text-ink-muted">
            {crumbs.join(" › ")}
            {version < asset.versions.length && <span className="ml-2 font-semibold text-[#cc4b2c]">Version antérieure</span>}
          </p>
        </div>
        <StatusBadge status={asset.status} running={asset.running} className="ml-1" />

        <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:ml-auto lg:w-auto lg:flex-nowrap lg:gap-3">
          {iApproved && asset.approvedBy[0] && <span className="hidden md:flex"><AvatarStack ids={asset.approvedBy.slice(0, 1)} size={28} /></span>}
          <span className="hidden text-xs font-medium tabular-nums text-ink-muted md:inline">
            {iApproved ? (approverName ? `Approuvée par ${approverName}` : "1/1 validation") : "0/1 validation"}
          </span>
          <button
            onClick={() => setShareOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-line-strong px-3 text-[13px] font-semibold text-ink hover:bg-surface-3 sm:px-3.5"
            aria-label="Partager"
          >
            <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">Partager</span>
          </button>
          <button
            onClick={() => downloadVersion(asset.id, version)}
            className="flex h-9 items-center gap-2 rounded-lg border border-line-strong px-3 text-[13px] font-semibold text-ink hover:bg-surface-3 sm:px-3.5"
            aria-label={`Télécharger la V${version}`}
            title={`Télécharger la V${version}`}
          >
            <Download className="h-4 w-4" /> <span className="hidden xl:inline">Télécharger</span>
          </button>

          {/* Régénérer : l'assistant IA applique les commentaires non résolus */}
          {(asset.status === "changes" || regenerating) && (
            <button
              disabled={regenerating || open === 0}
              onClick={() => regenerate(asset.id)}
              title={regenerating ? "L'assistant applique les commentaires, une nouvelle version arrive." : open === 0 ? "Ajoutez au moins un commentaire." : `Appliquer ${open} commentaire${open > 1 ? "s" : ""} et régénérer la vidéo`}
              className="flex h-9 items-center gap-2 rounded-lg bg-[#9a7cf0] px-3 text-[13px] font-bold sm:px-4 text-white hover:brightness-110 disabled:opacity-50"
            >
              {regenerating ? <Spinner className="h-4 w-4 border-white/30 border-t-white" /> : <RotateCcw className="h-4 w-4" />}
              {regenerating ? "Régénération en cours…" : `Régénérer${open ? ` (${open})` : ""}`}
            </button>
          )}

          {/* Bouton d'approbation (impossible tant que des commentaires ne sont pas résolus) */}
          <div className={cn("flex h-9 overflow-hidden rounded-lg", iApproved ? "border border-white bg-surface text-white" : "bg-white text-black", open > 0 && !iApproved && "opacity-40")}>
            <button
              title={open > 0 ? `Impossible de valider : ${open} commentaire${open > 1 ? "s" : ""} non résolu${open > 1 ? "s" : ""}` : undefined}
              onClick={() => {
                if (iApproved) return;
                if (open > 0) return toast(`Impossible de valider : ${open} commentaire${open > 1 ? "s" : ""} non résolu${open > 1 ? "s" : ""}. Cliquez sur « Régénérer » ou résolvez-les.`, true);
                approve(asset.id, version);
                toast(`V${version} approuvée`);
              }}
              className={cn("flex items-center gap-2 px-3 text-[13px] font-bold sm:px-4", !iApproved && "hover:bg-accent-hover")}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
              {iApproved ? "Approuvé" : `Approuver la V${version}`}
            </button>
            <Dropdown
              align="right"
              className={cn("border-l", iApproved ? "border-white/20" : "border-white/20")}
              trigger={(_, t) => (
                <button onClick={t} className={cn("flex h-full w-8 items-center justify-center", iApproved ? "hover:bg-surface-3" : "hover:bg-accent-hover")} aria-label="Autres décisions">
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}
              panelClassName="w-[240px] max-w-[calc(100vw-24px)]"
            >
              {(close) => (
                <>
                  {iApproved && (
                    <MenuItem icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => { revokeApproval(asset.id, asset.versions.at(-1)?.v ?? version); toast("Approbation annulée"); close(); }}>
                      Annuler l'approbation
                    </MenuItem>
                  )}
                  <MenuItem
                    icon={<span className="h-2 w-2 rounded-full" style={{ background: STATUS_META.changes.dot }} />}
                    onClick={() => { setStatus([asset.id], "changes"); toast("Modifications demandées"); close(); }}
                  >
                    Demander des modifications
                  </MenuItem>
                  <MenuItem
                    icon={<span className="h-2 w-2 rounded-full" style={{ background: STATUS_META.needs_review.dot }} />}
                    onClick={() => { setStatus([asset.id], "needs_review"); toast("Marqué « À sous-titrer »"); close(); }}
                  >
                    Marquer « À sous-titrer »
                  </MenuItem>
                  <div className="my-1 h-px bg-line" />
                  <MenuItem
                    icon={<ImageIcon className="h-3.5 w-3.5" />}
                    onClick={() => {
                      close();
                      const el = video.current;
                      if (!el || !el.videoWidth) return toast("La vidéo n'est pas encore chargée", true);
                      const scale = Math.min(1, 720 / Math.max(el.videoWidth, el.videoHeight));
                      const c = document.createElement("canvas");
                      c.width = Math.round(el.videoWidth * scale);
                      c.height = Math.round(el.videoHeight * scale);
                      try {
                        c.getContext("2d")!.drawImage(el, 0, 0, c.width, c.height);
                        c.toBlob((b) => b && setThumbnail(asset.id, version, b), "image/jpeg", 0.85);
                      } catch {
                        toast("Impossible de capturer cette image", true);
                      }
                    }}
                  >
                    Utiliser l&apos;image actuelle comme miniature
                  </MenuItem>
                  <MenuItem
                    danger
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={async () => {
                      close();
                      if (!confirm(`Supprimer définitivement « ${asset.title} » et toutes ses versions ?`)) return;
                      await deleteVideo(asset.id);
                      router.push("/projects");
                    }}
                  >
                    Supprimer la vidéo
                  </MenuItem>
                </>
              )}
            </Dropdown>
          </div>
          <Avatar userId={me} size={32} className="hidden lg:block" />
        </div>
      </header>

      {/* ============ Corps ============ */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Scène + contrôles */}
        <div ref={shell} className="order-1 flex h-[48dvh] min-w-0 shrink-0 flex-col bg-stage p-1.5 md:h-[56dvh] lg:order-none lg:h-auto lg:flex-1 lg:shrink">
          <div ref={stage} className="relative flex min-h-0 flex-1 items-center justify-center py-2 lg:py-4">
            <div
              className={cn("relative overflow-visible bg-black shadow-sm", showPins ? "cursor-crosshair" : "cursor-pointer")}
              style={{ width: box.w, height: box.h }}
              onClick={(e) => {
                if (!showPins) return togglePlay();
                const r = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - r.left) / r.width) * 100;
                const y = ((e.clientY - r.top) / r.height) * 100;
                startDraftAt(video.current?.currentTime ?? current, { x, y });
              }}
            >
              <video
                key={v.path}
                ref={video}
                src={src ?? undefined}
                playsInline
                crossOrigin="anonymous"
                preload="auto"
                className="h-full w-full object-cover"
                onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
                onPlay={() => setPlaying(true)}
                onPause={(e) => { setPlaying(false); setCurrent(e.currentTarget.currentTime); }}
                onSeeked={(e) => setCurrent(e.currentTarget.currentTime)}
                onProgress={(e) => {
                  const b = e.currentTarget.buffered;
                  if (b.length) setBuffered(b.end(b.length - 1));
                }}
                onError={() => setError(true)}
              />

              {cc && (
                <div className="pointer-events-none absolute inset-x-0 bottom-[12%] flex justify-center px-6">
                  <span className="rounded bg-black/75 px-2 py-1 text-center text-[13px] font-semibold text-white">
                    {SUBS[Math.min(SUBS.length - 1, Math.floor((current / (dur || 1)) * SUBS.length))]}
                  </span>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-6 text-center text-white">
                  <p className="text-[14px] font-semibold">Impossible de lire la vidéo de démonstration</p>
                  <p className="text-xs text-white/70">Format non lu par le navigateur : réimportez la vidéo en MP4 (H.264).</p>
                </div>
              )}

              {/* Grand bouton lecture */}
              {!playing && !draft && !activeComment && !error && (
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-transform hover:scale-105"
                  aria-label="Lecture"
                >
                  <Play className="ml-0.5 h-6 w-6 fill-white" />
                </button>
              )}

              {/* Épingles existantes */}
              {showPins &&
                pins.map((c) => {
                  const u = userById(c.authorId);
                  const active = c.id === activeId;
                  return (
                    <button
                      key={c.id}
                      onClick={(e) => { e.stopPropagation(); selectComment(c); }}
                      className={cn(
                        "absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ring-[3px] ring-white/90 shadow-md transition-transform",
                        active && "scale-110"
                      )}
                      style={{ left: `${c.x}%`, top: `${c.y}%`, background: u.fg }}
                      aria-label={`Note de ${u.name}`}
                    >
                      <span className="h-2 w-2 rounded-full bg-surface" />
                    </button>
                  );
                })}

              {/* Bulle du commentaire actif */}
              {showPins && activeComment && activeComment.x !== undefined && (
                <PinBubble x={activeComment.x} y={activeComment.y!} onClose={() => setActiveId(null)}>
                  <div className="flex items-center gap-2">
                    <Avatar userId={activeComment.authorId} size={22} />
                    <span className="text-[13px] font-semibold text-ink">{userById(activeComment.authorId).name}</span>
                    <span className="text-xs text-ink-faint">{timeAgo(activeComment.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-snug text-ink">{activeComment.text}</p>
                  {activeComment.replies.length > 0 && (
                    <p className="mt-1.5 text-xs font-medium text-ink-muted">
                      {activeComment.replies.length} réponse{activeComment.replies.length > 1 ? "s" : ""}
                    </p>
                  )}
                  <div className="mt-3">
                    <ReplyBox
                      onSend={(t) => addReply(activeComment.id, t)}
                      onResolve={() => toggleResolved(activeComment.id)}
                      resolved={activeComment.resolved}
                    />
                  </div>
                </PinBubble>
              )}

              {/* Nouvelle note posée sur l'image */}
              {draft?.x !== undefined && (
                <>
                  <span
                    className="pointer-events-none absolute z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full ring-[3px] ring-white"
                    style={{ left: `${draft.x}%`, top: `${draft.y}%`, background: userById(me).fg }}
                  />
                  <PinBubble x={draft.x} y={draft.y!} onClose={() => setDraft(null)}>
                    <DraftForm time={draft.time} onCancel={() => setDraft(null)} onSubmit={(t) => submit(t, draft.time, { x: draft.x, y: draft.y })} />
                  </PinBubble>
                </>
              )}
            </div>

            {/* Indication */}
            {showPins && !draft && (
              <p className="pointer-events-none absolute right-3 top-2 rounded-md bg-surface/80 px-2 py-1 text-[11.5px] font-medium text-ink-muted backdrop-blur">
                Cliquez sur l'image pour déposer une note
              </p>
            )}
          </div>

          {/* Barre de contrôle */}
          <div className="mx-auto flex w-full max-w-[1100px] shrink-0 items-center gap-2 rounded-2xl bg-surface px-2 py-2 shadow-card sm:gap-3 sm:px-4 sm:py-2.5">
            <button onClick={() => seek(0)} className="hidden text-ink hover:text-white sm:block" aria-label="Début" title="Début">
              <SkipBack className="h-[18px] w-[18px] fill-current" />
            </button>
            <button
              onClick={togglePlay}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 sm:h-11 sm:w-11"
              aria-label={playing ? "Pause" : "Lecture"}
              title="Lecture / pause (espace)"
            >
              {playing ? <Pause className="h-5 w-5 fill-black" /> : <Play className="ml-0.5 h-5 w-5 fill-black" />}
            </button>
            <button onClick={() => seek(dur)} className="hidden text-ink hover:text-white sm:block" aria-label="Fin" title="Fin">
              <SkipForward className="h-[18px] w-[18px] fill-current" />
            </button>

            <div className="flex items-center gap-0.5 sm:ml-1">
              <button onClick={() => jumpComment(-1)} className="hidden rounded p-1 sm:block text-ink-soft hover:bg-surface-3 hover:text-ink" title="Commentaire précédent">
                <ChevronLeft className="h-[18px] w-[18px]" />
              </button>
              <button onClick={() => startDraftAt(video.current?.currentTime ?? current)} className="rounded p-1 text-ink-soft hover:bg-surface-3 hover:text-ink" title="Commenter ce timecode (C)">
                <Bookmark className="h-[17px] w-[17px]" />
              </button>
              <button onClick={() => jumpComment(1)} className="hidden rounded p-1 sm:block text-ink-soft hover:bg-surface-3 hover:text-ink" title="Commentaire suivant">
                <ChevronRight className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="mx-1 min-w-0 flex-1 sm:mx-2">
              <Timeline
                current={current}
                duration={dur}
                buffered={buffered}
                comments={comments}
                activeId={activeId}
                onSeek={(t) => { setDraft(null); seek(t); }}
                onAddAt={(t) => startDraftAt(t)}
                onMarker={selectComment}
              />
            </div>

            <button
              onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
              className="w-9 rounded py-1 text-[13px] font-semibold tabular-nums text-ink hover:bg-surface-3"
              title="Vitesse de lecture"
            >
              {speed}x
            </button>
            <IconToggle on={!showPins} onClick={() => setShowPins((s) => !s)} title={showPins ? "Masquer les annotations" : "Afficher les annotations"}>
              {showPins ? <PenLine className="h-[17px] w-[17px]" /> : <PenOff className="h-[17px] w-[17px]" />}
            </IconToggle>
            <div className="group/vol relative hidden items-center md:flex">
              <IconToggle on={false} onClick={() => setMuted((m) => !m)} title="Son (M)">
                {muted || volume === 0 ? <VolumeX className="h-[17px] w-[17px]" /> : <Volume2 className="h-[17px] w-[17px]" />}
              </IconToggle>
              <div className="absolute bottom-full left-1/2 mb-3 hidden -translate-x-1/2 rounded-lg bg-surface px-3 py-2 shadow-pop group-hover/vol:block">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
                  className="range w-24"
                  aria-label="Volume"
                />
              </div>
            </div>
            <button onClick={() => setHd((h) => !h)} title="Qualité" className={cn("hidden rounded px-1 text-[10px] font-extrabold md:block", hd ? "bg-white text-black" : "bg-field text-ink-muted")}>
              HD
            </button>
            <span className="hidden md:contents">
              <IconToggle on={loop} onClick={() => setLoop((l) => !l)} title="Lecture en boucle">
                <Repeat className="h-[17px] w-[17px]" />
              </IconToggle>
            </span>
            <IconToggle on={false} onClick={toggleFullscreen} title="Plein écran (F)">
              {fullscreen ? <Minimize className="h-[17px] w-[17px]" /> : <Maximize className="h-[17px] w-[17px]" />}
            </IconToggle>
          </div>
        </div>

        {/* Panneau latéral (sous la vidéo sur mobile et tablette) */}
        <div className="order-3 flex min-h-0 flex-1 lg:order-none lg:flex-none">
        {panel === "comments" && (
          <CommentsPanel
            ref={panelRef}
            comments={comments}
            src={src ?? ""}
            current={current}
            activeId={activeId}
            pendingTime={draft && draft.x === undefined ? draft.time : null}
            onSelect={selectComment}
            onSubmit={(t, time) => submit(t, time)}
            onCancelPending={() => setDraft(null)}
          />
        )}
        {panel === "info" && <InfoPanel asset={asset} version={version} />}
        {panel === "versions" && <VersionsPanel asset={asset} version={version} comments={assetComments} onPick={setVersion} onUpload={() => upload.open({ assetId: asset.id })} />}
        {panel === "activity" && <ActivityPanel asset={asset} comments={assetComments} />}
        </div>

        {/* Rail d'icônes */}
        <nav className="thin-scroll order-2 flex h-12 w-full shrink-0 items-center gap-1 overflow-x-auto border-y border-line bg-surface px-2 lg:order-none lg:h-auto lg:w-12 lg:flex-col lg:overflow-visible lg:border-y-0 lg:border-l lg:px-0 lg:py-3">
          <RailButton active={panel === "info"} onClick={() => setPanel("info")} title="Informations"><Info className="h-[19px] w-[19px]" /></RailButton>
          <RailButton active={panel === "comments"} onClick={() => setPanel("comments")} title="Commentaires" badge={comments.filter((c) => !c.resolved).length}>
            <MessageSquare className="h-[19px] w-[19px]" />
          </RailButton>
          <RailButton active={panel === "activity"} onClick={() => setPanel("activity")} title="Activité"><ActivityIcon className="h-[19px] w-[19px]" /></RailButton>
          <RailButton onClick={() => downloadVersion(asset.id, version)} title="Télécharger"><Download className="h-[19px] w-[19px]" /></RailButton>
          <RailButton active={cc} onClick={() => setCc((x) => !x)} title="Sous-titres"><Captions className="h-[19px] w-[19px]" /></RailButton>
          <RailButton active={panel === "versions"} onClick={() => setPanel("versions")} title="Versions"><History className="h-[19px] w-[19px]" /></RailButton>
          <RailButton onClick={() => setShareOpen(true)} title="Partager"><Share2 className="h-[19px] w-[19px]" /></RailButton>
          <div className="hidden lg:mt-auto lg:block">
            <RailButton active={helpOpen} onClick={() => setHelpOpen((h) => !h)} title="Raccourcis clavier (?)"><Keyboard className="h-[19px] w-[19px]" /></RailButton>
          </div>
        </nav>
      </div>

      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} asset={asset} version={version} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PinBubble({ x, y, onClose, children }: { x: number; y: number; onClose: () => void; children: React.ReactNode }) {
  const left = x > 50; // ouvrir du côté où il y a de la place
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute z-20 w-[300px] max-w-[80vw] animate-fade-in cursor-default rounded-xl bg-surface p-3.5 shadow-pop"
      style={{
        top: `${Math.min(Math.max(y, 12), 80)}%`,
        ...(left ? { right: `calc(${100 - x}% + 22px)` } : { left: `calc(${x}% + 22px)` }),
        transform: "translateY(-30%)",
      }}
    >
      <button onClick={onClose} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-ink-muted shadow-md hover:text-ink" aria-label="Fermer">
        <X className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}

function DraftForm({ time, onSubmit, onCancel }: { time: number; onSubmit: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  return (
    <div>
      <div className="flex items-center gap-2">
        <Avatar userId={useStore().me?.id} size={22} />
        <span className="text-[13px] font-semibold text-ink">Nouvelle note</span>
        <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-black">{timecode(time)}</span>
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) onSubmit(text.trim());
          }
          if (e.key === "Escape") onCancel();
        }}
        rows={3}
        placeholder="Décrivez la modification souhaitée…"
        className="mt-2.5 w-full resize-none rounded-lg bg-field px-3 py-2 text-[13.5px] text-ink outline-none placeholder:text-ink-faint focus:bg-surface-3 focus:ring-1 focus:ring-white"
      />
      <div className="mt-2 flex justify-end gap-1.5">
        <button onClick={onCancel} className="h-8 rounded-md px-2.5 text-[12.5px] font-semibold text-ink-soft hover:bg-surface-3">
          Annuler
        </button>
        <button
          disabled={!text.trim()}
          onClick={() => onSubmit(text.trim())}
          className="h-8 rounded-md bg-white px-3 text-[12.5px] font-semibold text-black disabled:opacity-25"
        >
          Publier
        </button>
      </div>
    </div>
  );
}

function IconToggle({ on, onClick, title, children }: { on: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className={cn("rounded p-1 transition-colors hover:bg-surface-3", on ? "text-white" : "text-ink-soft hover:text-ink")}>
      {children}
    </button>
  );
}

function RailButton({ active, onClick, title, badge, children }: { active?: boolean; onClick: () => void; title: string; badge?: number; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn("relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors", active ? "bg-white text-black" : "text-ink-faint hover:bg-surface-3 hover:text-ink")}
    >
      {children}
      {!!badge && !active && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9.5px] font-bold text-black ring-2 ring-surface">
          {badge}
        </span>
      )}
    </button>
  );
}

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["Espace / K", "Lecture / pause"],
    ["← / →", "Image précédente / suivante"],
    ["⇧ + ← / →", "Reculer / avancer d'1 s"],
    ["C", "Commenter au timecode courant"],
    ["Clic sur l'image", "Déposer une note épinglée"],
    ["M", "Couper le son"],
    ["F", "Plein écran"],
    ["Échap", "Fermer la note"],
  ];
  return (
    <div className="fixed bottom-6 right-16 z-50 w-[300px] animate-fade-in rounded-xl bg-surface p-4 shadow-pop">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-ink">Raccourcis clavier</h3>
        <button onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Fermer"><X className="h-4 w-4" /></button>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map(([k, d]) => (
          <li key={k} className="flex items-center justify-between text-[12.5px]">
            <span className="text-ink-soft">{d}</span>
            <kbd className="rounded-md border border-line bg-field px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink">{k}</kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}
