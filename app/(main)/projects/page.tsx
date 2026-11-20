"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownAZ, Check, ChevronDown, FolderPlus, PanelLeft, Search, SlidersHorizontal, Upload, X } from "lucide-react";
import { AssetCard, AssetTable, FolderCard } from "@/components/AssetCard";
import { EmptyState, Spinner, ViewToggle } from "@/components/Common";
import { Dropdown, MenuItem } from "@/components/Dropdown";
import { FolderTree } from "@/components/FolderTree";
import { Modal } from "@/components/Modal";
import { useUpload } from "@/components/UploadModal";
import { ROOT_ID, STATUS_META, STATUS_ORDER } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { Status } from "@/lib/types";
import { childFolders, cn, descendantIds, folderById, folderPath } from "@/lib/utils";

type Sort = "az" | "za" | "recent";
const SORT_LABEL: Record<Sort, string> = { az: "A-Z", za: "Z-A", recent: "Récents" };
// Taille des vignettes : de la plus petite (0) à la plus grande (3), adaptée à la largeur de l'écran
const COLS = [
  "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6",
  "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5",
  "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
];
const isSmallScreen = () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsView />
    </Suspense>
  );
}

function ProjectsView() {
  const params = useSearchParams();
  const folderId = params.get("f") ?? ROOT_ID;
  const { assets, folders, loading, setStatus, toast } = useStore();
  const upload = useUpload();

  const [showTree, setShowTree] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("az");
  const [status, setStatusFilter] = useState<Status | "all">("all");
  const [zoom, setZoom] = useState(2);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [brandOpen, setBrandOpen] = useState(false);

  useEffect(() => {
    setSelected(new Set());
    setQuery("");
    if (isSmallScreen()) setShowTree(false); // sur mobile/tablette, l'arborescence se referme après un choix
  }, [folderId]);

  const current = folderById(folders, folderId);
  const path = folderPath(folders, folderId);
  const q = query.trim().toLowerCase();

  const subFolders = useMemo(() => {
    const list = childFolders(folders, folderId).filter((f) => !q || f.name.toLowerCase().includes(q));
    return sort === "za" ? [...list].reverse() : list;
  }, [folders, folderId, q, sort]);

  const items = useMemo(() => {
    const scope = q || folderId === ROOT_ID ? (folderId === ROOT_ID ? null : descendantIds(folders, folderId)) : [folderId];
    const list = assets.filter(
      (a) =>
        (folderId === ROOT_ID ? !!q : true) &&
        (!scope || scope.includes(a.folderId)) &&
        (!q || a.title.toLowerCase().includes(q)) &&
        (status === "all" || a.status === status)
    );
    return list.sort((a, b) =>
      sort === "recent" ? b.updatedAt.localeCompare(a.updatedAt) : (sort === "az" ? 1 : -1) * a.title.localeCompare(b.title, "fr", { numeric: true })
    );
  }, [assets, folders, folderId, q, status, sort]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allSelected = items.length > 0 && items.every((a) => selected.has(a.id));
  const openUpload = () => upload.open(current ? { brandId: current.brandId, campaign: current.campaign } : {});

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  return (
    <>
      {showTree && (
        <>
          {/* Sur mobile/tablette, l'arborescence s'ouvre par-dessus la page */}
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setShowTree(false)} />
          <FolderTree currentId={folderId} className="fixed inset-y-0 left-0 z-50 shadow-pop lg:static lg:z-auto lg:shadow-none" />
        </>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-canvas px-4">
          <button onClick={() => setShowTree((s) => !s)} className="rounded-md p-1 text-ink-muted hover:bg-surface-2 hover:text-ink" aria-label="Afficher/masquer l'arborescence">
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
          <nav className="flex min-w-0 items-center gap-1.5 text-[13.5px]">
            <Link href="/projects" className={cn("hover:underline", path.length ? "text-ink-muted" : "font-extrabold text-ink")}>Projets</Link>
            {path.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1.5">
                <span className="text-ink-faint">›</span>
                <Link href={`/projects?f=${encodeURIComponent(f.id)}`} className={cn("truncate hover:underline", i === path.length - 1 ? "font-extrabold text-ink" : "text-ink-muted")}>
                  {f.name}
                </Link>
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <input type="range" min={0} max={3} step={1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="range hidden w-[72px] sm:block" aria-label="Taille des vignettes" disabled={view === "list"} />
            <ViewToggle view={view} onChange={setView} className="!h-8" />
          </div>
        </div>

        <div className="flex min-h-[54px] shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-canvas px-4 py-2">
          {selected.size > 0 ? (
            <>
              <span className="text-[13px] font-bold text-ink">{selected.size} sélectionnée{selected.size > 1 ? "s" : ""}</span>
              <Dropdown
                trigger={(_, t) => (
                  <button onClick={t} className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-bold text-black">
                    Changer le statut <ChevronDown className="h-4 w-4" />
                  </button>
                )}
              >
                {(close) =>
                  STATUS_ORDER.map((s) => (
                    <MenuItem
                      key={s}
                      icon={<span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].dot }} />}
                      onClick={() => { setStatus([...selected], s); toast(`${selected.size} vidéo(s) → ${STATUS_META[s].label}`); setSelected(new Set()); close(); }}
                    >
                      {STATUS_META[s].label}
                    </MenuItem>
                  ))
                }
              </Dropdown>
              <button onClick={() => setSelected(new Set())} className="flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-ink-soft hover:bg-surface-2">
                <X className="h-4 w-4" /> Annuler
              </button>
            </>
          ) : (
            <>
              <div className="relative w-full sm:w-auto">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={folderId === ROOT_ID ? "Rechercher partout" : "Rechercher dans le dossier"}
                  className="h-8 w-full rounded-md sm:w-[230px] border border-line-strong bg-surface pl-8 pr-7 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-white"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink" aria-label="Effacer">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Dropdown
                trigger={(_, t) => (
                  <button onClick={t} className="flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-bold text-ink hover:bg-surface-2">
                    <ArrowDownAZ className="h-4 w-4 text-ink-muted" /> {SORT_LABEL[sort]} <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                )}
              >
                {(close) => (Object.keys(SORT_LABEL) as Sort[]).map((k) => <MenuItem key={k} active={k === sort} onClick={() => { setSort(k); close(); }}>{SORT_LABEL[k]}</MenuItem>)}
              </Dropdown>
              <Dropdown
                trigger={(_, t) => (
                  <button onClick={t} className={cn("flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold hover:bg-surface-2", status !== "all" ? "text-white ring-1 ring-white" : "text-ink-soft")}>
                    <SlidersHorizontal className="h-4 w-4" /> {status === "all" ? "Statut" : STATUS_META[status].label} <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <MenuItem active={status === "all"} onClick={() => { setStatusFilter("all"); close(); }}>Tous les statuts</MenuItem>
                    {STATUS_ORDER.map((s) => (
                      <MenuItem key={s} active={status === s} icon={<span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].dot }} />} onClick={() => { setStatusFilter(s); close(); }}>
                        {STATUS_META[s].label}
                      </MenuItem>
                    ))}
                  </>
                )}
              </Dropdown>
              {items.length > 0 && (
                <button onClick={() => setSelected(allSelected ? new Set() : new Set(items.map((a) => a.id)))} className="flex items-center gap-2 text-[13px] text-ink-soft hover:text-ink">
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded-[4px] border", allSelected ? "border-white bg-white text-black" : "border-line-strong")}>
                    {allSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  Tout sélectionner
                </button>
              )}
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setBrandOpen(true)} className="flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-semibold text-ink hover:bg-surface-2">
              <FolderPlus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvelle marque</span>
            </button>
            <button onClick={openUpload} className="flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-[13px] font-bold text-black hover:bg-accent-hover">
              <Upload className="h-4 w-4" /> Importer<span className="hidden sm:inline">&nbsp;une vidéo</span>
            </button>
          </div>
        </div>

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4">
          {subFolders.length === 0 && items.length === 0 ? (
            q || status !== "all" ? (
              <EmptyState title="Aucun résultat" text="Modifiez la recherche ou le filtre de statut." onReset={() => { setQuery(""); setStatusFilter("all"); }} />
            ) : (
              <EmptyState title="Ce dossier est vide" text={current ? `Importez une première vidéo pour ${current.name}.` : "Créez une marque puis importez une vidéo."} onUpload={openUpload} />
            )
          ) : view === "grid" ? (
            <div className={cn("grid gap-4", COLS[zoom])}>
              {subFolders.map((f) => <FolderCard key={f.id} folder={f} />)}
              {items.map((a) => <AssetCard key={a.id} asset={a} selected={selected.has(a.id)} onSelect={toggle} showClient={!!q} />)}
            </div>
          ) : (
            <div className="space-y-4">
              {subFolders.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{subFolders.map((f) => <FolderCard key={f.id} folder={f} compact />)}</div>}
              {items.length > 0 && <AssetTable assets={items} selected={selected} onSelect={toggle} />}
            </div>
          )}
        </div>
      </main>

      <NewBrandModal open={brandOpen} onClose={() => setBrandOpen(false)} />
    </>
  );
}

function NewBrandModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createBrand } = useStore();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const b = await createBrand(name);
    setBusy(false);
    if (b) {
      setName("");
      onClose();
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle marque" subtitle="Elle apparaîtra dans les projets et au moment de l'import." className="max-w-[440px]">
      <div className="p-6">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Nom de la marque"
          className="h-11 w-full rounded-lg border border-line-strong bg-surface-2 px-3 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-white"
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <button onClick={onClose} className="h-10 rounded-lg px-4 text-[13px] font-semibold text-ink-soft hover:bg-surface-2">Annuler</button>
        <button onClick={submit} disabled={!name.trim() || busy} className="h-10 rounded-lg bg-white px-4 text-[13px] font-bold text-black hover:bg-accent-hover disabled:opacity-30">
          Créer la marque
        </button>
      </div>
    </Modal>
  );
}
