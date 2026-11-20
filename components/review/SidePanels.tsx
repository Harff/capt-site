"use client";

import { Check, CheckCircle2, Film, MessageSquare, Trash2, Upload } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { useStore } from "@/lib/store";
import type { Asset, Comment } from "@/lib/types";
import { cn, duration, timeAgo, timecode } from "@/lib/utils";

function Shell({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="flex min-h-0 w-full flex-col bg-surface lg:w-[392px] lg:shrink-0 lg:border-l lg:border-line">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 pb-3.5 pt-4">
        <h2 className="text-[19px] font-extrabold text-ink">{title}</h2>
        {action}
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </section>
  );
}

export function InfoPanel({ asset, version }: { asset: Asset; version: number }) {
  const { userById } = useStore();
  const v = asset.versions.find((x) => x.v === version);
  const rows: [string, React.ReactNode][] = [
    ["Marque", asset.brandName],
    ["Dossier", asset.campaign ?? "—"],
    ["Statut", <StatusBadge key="s" status={asset.status} running={asset.running} size="sm" />],
    ["Durée", duration(v?.duration ?? asset.duration)],
    ["Format", v?.width && v?.height ? `${asset.aspect} · ${v.width}×${v.height}` : asset.aspect],
    ["Version", v ? `V${v.v}${v.note ? ` — ${v.note}` : ""}` : "—"],
    ["Importée par", v ? `${userById(v.uploadedBy).name}, ${timeAgo(v.uploadedAt)}` : "—"],
    ["Créée", timeAgo(asset.createdAt)],
  ];
  return (
    <Shell title="Informations">
      <dl className="space-y-3">
        {rows.map(([k, val]) => (
          <div key={k} className="flex gap-3 text-[13px]">
            <dt className="w-[96px] shrink-0 text-ink-muted">{k}</dt>
            <dd className="min-w-0 font-semibold text-ink">{val}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-7 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">Validation de la V{asset.versions.at(-1)?.v}</h3>
      {/* Une seule approbation suffit, quel que soit le nombre de personnes qui ont commenté */}
      <div className="mt-2.5 flex items-center gap-3">
        {asset.status === "approved" && asset.approvedBy[0] ? <Avatar userId={asset.approvedBy[0]} size={30} /> : <span className="h-[30px] w-[30px] rounded-full bg-surface-3" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-ink">
            {asset.status === "approved" ? (asset.approvedBy[0] ? userById(asset.approvedBy[0]).name : "Approuvée") : "Personne pour l'instant"}
          </p>
        </div>
        <span className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-bold", asset.status === "approved" ? "bg-white text-black" : "bg-surface-3 text-ink-muted")}>
          {asset.status === "approved" && <Check className="h-3 w-3" strokeWidth={3} />}
          {asset.status === "approved" ? "Approuvé" : "En attente"}
        </span>
      </div>
    </Shell>
  );
}

export function VersionsPanel({ asset, version, comments, onPick, onUpload }: { asset: Asset; version: number; comments: Comment[]; onPick: (v: number) => void; onUpload: () => void }) {
  const { userById, deleteVersion } = useStore();
  const latest = asset.versions.at(-1)?.v;
  const remove = async (v: number, n: number) => {
    const extra = n > 1 ? ` et ses ${n} commentaires` : n === 1 ? " et son commentaire" : "";
    if (!confirm(`Supprimer définitivement la V${v}${extra} ?\nLe fichier vidéo sera effacé du stockage.`)) return;
    await deleteVersion(asset.id, v);
  };
  return (
    <Shell
      title="Versions"
      action={
        <button onClick={onUpload} className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[12.5px] font-bold text-black hover:bg-accent-hover">
          <Upload className="h-3.5 w-3.5" /> Nouvelle version
        </button>
      }
    >
      <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-line-strong">
        {[...asset.versions].reverse().map((v) => {
          const n = comments.filter((c) => c.version === v.v).length;
          const cur = v.v === version;
          const locked = asset.versions.length <= 1 || (asset.status === "approved" && v.v === latest);
          return (
            <li key={v.v} className="group relative flex gap-3">
              <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold ring-4 ring-surface", cur ? "bg-white text-black" : "bg-surface-3 text-ink-soft")}>
                V{v.v}
              </span>
              <button onClick={() => onPick(v.v)} className={cn("min-w-0 flex-1 rounded-xl border p-3 text-left transition-colors", cur ? "border-white" : "border-line-strong hover:border-ink-faint")}>
                <p className="text-[13px] font-bold text-ink">{v.note || (v.v === 1 ? "Premier montage" : `Version ${v.v}`)}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{userById(v.uploadedBy).name} · {timeAgo(v.uploadedAt)}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-ink-soft">
                  <MessageSquare className="h-3.5 w-3.5" /> {n} commentaire{n > 1 ? "s" : ""}
                  {v.v === latest && <span className="ml-auto rounded bg-surface-3 px-1.5 py-0.5 text-[10.5px] font-bold">Dernière</span>}
                </p>
              </button>
              {/* Suppression manuelle d'une version (libère de l'espace de stockage) */}
              <button
                onClick={() => remove(v.v, n)}
                disabled={locked}
                title={asset.versions.length <= 1 ? "Seule version : supprimez plutôt la vidéo" : locked ? "Version approuvée : annulez d'abord l'approbation" : `Supprimer la V${v.v}`}
                aria-label={`Supprimer la V${v.v}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg text-ink-faint transition hover:bg-[#ef6a47]/15 hover:text-[#ff9b80] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-faint"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ol>
    </Shell>
  );
}

export function ActivityPanel({ asset, comments }: { asset: Asset; comments: Comment[] }) {
  const { userById } = useStore();
  type Ev = { at: string; user: string | null; icon: React.ReactNode; text: React.ReactNode };
  const events: Ev[] = [
    ...asset.versions.map((v) => ({ at: v.uploadedAt, user: v.uploadedBy, icon: <Upload className="h-3 w-3" />, text: <>a importé la <b>V{v.v}</b></> })),
    ...comments.map((c) => ({
      at: c.createdAt,
      user: c.authorId,
      icon: <MessageSquare className="h-3 w-3" />,
      text: <>a commenté la <b>V{c.version}</b>{c.time !== null && <> à <span className="tabular-nums">{timecode(c.time)}</span></>}</>,
    })),
    ...asset.approvedBy.map((u) => ({ at: asset.updatedAt, user: u, icon: <CheckCircle2 className="h-3 w-3" />, text: <>a <b>approuvé</b> la vidéo</> })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Shell title="Activité">
      <ul className="space-y-4">
        {events.map((e, i) => (
          <li key={i} className="flex gap-3">
            <span className="relative">
              <Avatar userId={e.user} size={28} />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-black ring-2 ring-surface">{e.icon}</span>
            </span>
            <div className="text-[13px] leading-snug text-ink-soft">
              <span className="font-bold text-ink">{userById(e.user).name}</span> {e.text}
              <p className="text-xs text-ink-faint">{timeAgo(e.at)}</p>
            </div>
          </li>
        ))}
        {events.length === 0 && <p className="flex items-center gap-2 text-[13px] text-ink-muted"><Film className="h-4 w-4" /> Aucune activité.</p>}
      </ul>
    </Shell>
  );
}
