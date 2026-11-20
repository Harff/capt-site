"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, Download, Folder, MessageSquare, Trash2, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Asset, Folder as FolderT } from "@/lib/types";
import { cn, descendantIds, duration, shortDate, timeAgo } from "@/lib/utils";
import { AvatarStack } from "./Avatar";
import { StatusMenu } from "./StatusBadge";
import { Thumbnail } from "./Thumbnail";

const stop = (e: React.MouseEvent) => e.stopPropagation();

/* Bouton « Télécharger » : dernière version de la vidéo */
function DownloadButton({ asset, className }: { asset: Asset; className?: string }) {
  const { downloadVersion } = useStore();
  if (!asset.versions.length) return null;
  const v = asset.versions[asset.versions.length - 1].v;
  return (
    <button
      type="button"
      onClick={(e) => { stop(e); downloadVersion(asset.id, v); }}
      className={cn("flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition hover:bg-white/15 hover:text-white", className)}
      aria-label={`Télécharger « ${asset.title} » V${v}`}
      title={`Télécharger la V${v}`}
    >
      <Download className="h-3.5 w-3.5" />
    </button>
  );
}

/* Bouton « Supprimer » d'une vidéo importée (avec confirmation) */
function DeleteButton({ asset, className }: { asset: Asset; className?: string }) {
  const { deleteVideo } = useStore();
  return (
    <button
      type="button"
      onClick={async (e) => {
        stop(e);
        const n = asset.versions.length;
        const what = n > 1 ? ` et ses ${n} versions` : "";
        if (!confirm(`Supprimer définitivement « ${asset.title} »${what} ?\nLes commentaires seront aussi supprimés.`)) return;
        await deleteVideo(asset.id);
      }}
      className={cn("flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition hover:bg-[#ef6a47]/15 hover:text-[#ff9b80]", className)}
      aria-label={`Supprimer « ${asset.title} »`}
      title="Supprimer la vidéo"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function Meta({ asset }: { asset: Asset }) {
  const { comments } = useStore();
  const open = comments.filter((c) => c.assetId === asset.id && !c.resolved).length;
  return (
    <div className="flex items-center gap-3 text-xs text-ink-muted">
      <span className="flex items-center gap-1" title={asset.status === "approved" ? "Vidéo approuvée" : "En attente d'approbation"}>
        <UserRound className="h-3.5 w-3.5" />
        {asset.status === "approved" ? 1 : 0}/1
      </span>
      {open > 0 && (
        <span className="flex items-center gap-1" title="Commentaires ouverts">
          <MessageSquare className="h-3.5 w-3.5" />
          {open}
        </span>
      )}
    </div>
  );
}

export function AssetCard({ asset, selected, onSelect, showClient }: { asset: Asset; selected?: boolean; onSelect?: (id: string) => void; showClient?: boolean }) {
  const router = useRouter();
  const latest = asset.versions[asset.versions.length - 1];
  const go = () => router.push(`/review/${asset.id}`);
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => e.key === "Enter" && go()}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-card bg-surface shadow-card outline-none transition-shadow hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-white",
        selected && "ring-2 ring-white"
      )}
    >
      <div className="relative">
        <Thumbnail asset={asset} className="aspect-[16/9]" />
        <div className="absolute right-2.5 top-2.5 flex gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <DownloadButton asset={asset} className="bg-black/55 text-white backdrop-blur-sm" />
          <DeleteButton asset={asset} className="bg-black/55 text-white backdrop-blur-sm" />
        </div>
        {onSelect && (
          <button
            onClick={(e) => { stop(e); onSelect(asset.id); }}
            className={cn(
              "absolute left-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-[5px] border-2 transition-opacity",
              selected ? "border-white bg-white text-black opacity-100" : "border-white bg-black/40 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            )}
            aria-label="Sélectionner"
          >
            {selected && <Check className="h-3 w-3" strokeWidth={3} />}
          </button>
        )}
      </div>
      <div className="px-4 pb-3 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[14px] font-bold text-ink">{asset.title}</h3>
          {latest && <span className="shrink-0 rounded-md bg-field px-1.5 py-0.5 text-[11px] font-bold text-ink-soft">V{latest.v}</span>}
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {showClient ? `${asset.brandName}${asset.campaign ? ` › ${asset.campaign}` : ""} · ` : ""}
          {timeAgo(asset.updatedAt)}
        </p>
        <div className="mt-3 flex h-7 items-center justify-between">
          <Meta asset={asset} />
          <span onClick={stop}>
            <StatusMenu assetId={asset.id} status={asset.status} running={asset.running} />
          </span>
        </div>
      </div>
    </div>
  );
}

export function FolderCard({ folder, compact }: { folder: FolderT; compact?: boolean }) {
  const { assets, folders } = useStore();
  const ids = descendantIds(folders, folder.id);
  const items = assets.filter((a) => ids.includes(a.folderId));
  const approved = items.filter((a) => a.status === "approved").length;
  const cover = items.find((a) => a.thumb);
  return (
    <Link href={`/projects?f=${encodeURIComponent(folder.id)}`} className="group overflow-hidden rounded-card bg-surface shadow-card transition-shadow hover:shadow-card-hover">
      <div className={cn("relative flex items-center justify-center overflow-hidden bg-surface-2", compact ? "aspect-[16/7]" : "aspect-[16/9]")}>
        {cover && !compact && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.thumb!} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[2px] transition-opacity group-hover:opacity-35" />
        )}
        <Folder className="relative h-14 w-14 fill-white text-white transition-transform group-hover:scale-105" strokeWidth={1.2} />
      </div>
      <div className="px-4 py-3.5 text-center">
        <h3 className="truncate text-[14px] font-bold text-ink">{folder.name}</h3>
        <p className="mt-0.5 text-xs text-ink-muted">
          {items.length} vidéo{items.length > 1 ? "s" : ""}
          {items.length > 0 && ` · ${approved} approuvée${approved > 1 ? "s" : ""}`}
        </p>
      </div>
    </Link>
  );
}

export function AssetRow({ asset, selected, onSelect }: { asset: Asset; selected?: boolean; onSelect?: (id: string) => void }) {
  const router = useRouter();
  const latest = asset.versions[asset.versions.length - 1];
  return (
    <tr onClick={() => router.push(`/review/${asset.id}`)} className={cn("group cursor-pointer border-b border-line last:border-0 hover:bg-surface-2", selected && "bg-surface-2")}>
      {onSelect && (
        <td className="w-10 pl-4" onClick={stop}>
          <button
            onClick={() => onSelect(asset.id)}
            className={cn("flex h-4 w-4 items-center justify-center rounded-[4px] border-2", selected ? "border-white bg-white text-black" : "border-line-strong")}
            aria-label="Sélectionner"
          >
            {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
          </button>
        </td>
      )}
      <td className="py-2.5 pl-4 pr-3">
        <div className="flex items-center gap-3">
          <Thumbnail asset={asset} showDuration={false} className="h-11 w-[78px] shrink-0 rounded-md" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-ink">{asset.title}</p>
            <p className="truncate text-xs text-ink-muted">
              {asset.brandName}
              {asset.campaign ? ` › ${asset.campaign}` : ""}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 text-xs font-bold text-ink-soft">{latest && <span className="rounded-md bg-field px-1.5 py-0.5">V{latest.v}</span>}</td>
      <td className="px-3 text-[13px] tabular-nums text-ink-soft">{duration(asset.duration)}</td>
      <td className="px-3"><AvatarStack ids={asset.approvedBy} size={22} /></td>
      <td className="px-3"><Meta asset={asset} /></td>
      <td className="px-3 text-[13px] text-ink-muted">
        {asset.dueAt ? <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{shortDate(asset.dueAt)}</span> : "—"}
      </td>
      <td className="px-3 text-[13px] text-ink-muted">{timeAgo(asset.updatedAt)}</td>
      <td className="pr-4 text-right" onClick={stop}>
        <div className="flex items-center justify-end gap-1">
          <StatusMenu assetId={asset.id} status={asset.status} running={asset.running} />
          <DownloadButton asset={asset} className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100" />
          <DeleteButton asset={asset} className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100" />
        </div>
      </td>
    </tr>
  );
}

export function AssetTable({ assets, selected, onSelect }: { assets: Asset[]; selected?: Set<string>; onSelect?: (id: string) => void }) {
  return (
    <div className="thin-scroll overflow-x-auto rounded-card bg-surface shadow-card">
      <table className="w-full min-w-[860px] text-left">
        <thead>
          <tr className="border-b border-line text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
            {onSelect && <th className="w-10 pl-4" />}
            <th className="py-2.5 pl-4 pr-3">Vidéo</th>
            <th className="px-3">Version</th>
            <th className="px-3">Durée</th>
            <th className="px-3">Approuvée par</th>
            <th className="px-3">Suivi</th>
            <th className="px-3">Échéance</th>
            <th className="px-3">Modifiée</th>
            <th className="pr-4 text-right">Statut</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <AssetRow key={a.id} asset={a} selected={selected?.has(a.id)} onSelect={onSelect} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
