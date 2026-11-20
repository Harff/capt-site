"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownAZ, ArrowRight, CheckCircle2, ChevronDown, Eye, FolderKanban, PenLine, Search, Upload, X } from "lucide-react";
import { AssetCard, AssetTable } from "@/components/AssetCard";
import { Avatar } from "@/components/Avatar";
import { EmptyState, Spinner, ViewToggle } from "@/components/Common";
import { Dropdown, MenuItem } from "@/components/Dropdown";
import { StatusFilter } from "@/components/StatusFilter";
import { useUpload } from "@/components/UploadModal";
import { useStore } from "@/lib/store";
import type { Status } from "@/lib/types";
import { brandFolderId, timeAgo, timecode } from "@/lib/utils";

type Sort = "recent" | "az" | "brand";
const SORT_LABEL: Record<Sort, string> = { recent: "Plus récentes", az: "A-Z", brand: "Par marque" };

export default function DashboardPage() {
  const { assets, comments, brands, me, loading, userById } = useStore();
  const upload = useUpload();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [brand, setBrand] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [today, setToday] = useState("");
  useEffect(() => setToday(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })), []);

  const pending = useMemo(() => assets.filter((a) => a.status === "needs_review").slice(0, 3), [assets]);

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter(
      (a) =>
        (brand === "all" || a.brandId === brand) &&
        (!q || a.title.toLowerCase().includes(q) || a.brandName.toLowerCase().includes(q) || a.campaign?.toLowerCase().includes(q))
    );
  }, [assets, brand, query]);

  const list = useMemo(() => {
    const out = scoped.filter((a) => status === "all" || a.status === status);
    return out.sort((a, b) =>
      sort === "az" ? a.title.localeCompare(b.title, "fr", { numeric: true }) : sort === "brand" ? a.brandName.localeCompare(b.brandName, "fr") : b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [scoped, status, sort]);

  const activity = useMemo(() => {
    const ev = [
      ...assets.flatMap((a) => a.versions.map((v) => ({ at: v.uploadedAt, user: v.uploadedBy, text: `a importé la V${v.v} de`, target: a.title, id: a.id }))),
      ...comments.map((c) => ({ at: c.createdAt, user: c.authorId, text: c.time !== null ? `a commenté à ${timecode(c.time).slice(3, 8)}` : "a commenté", target: assets.find((a) => a.id === c.assetId)?.title ?? "", id: c.assetId })),
    ];
    return ev.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  }, [assets, comments]);

  const openComments = comments.filter((c) => !c.resolved).length;
  const stats = [
    { label: "Vidéos", value: assets.length, icon: FolderKanban, hint: `${brands.length} marques` },
    { label: "À sous-titrer", value: assets.filter((a) => a.status === "needs_review").length, icon: Eye, hint: "En attente de sous-titres" },
    { label: "Modifications requises", value: assets.filter((a) => a.status === "changes").length, icon: PenLine, hint: `${openComments} commentaire${openComments > 1 ? "s" : ""} ouvert${openComments > 1 ? "s" : ""}` },
    { label: "Approuvées", value: assets.filter((a) => a.status === "approved").length, icon: CheckCircle2, hint: "Prêtes à publier" },
  ];

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  return (
    <main className="thin-scroll min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="h-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{today}</p>
            <h1 className="mt-1 text-[26px] font-extrabold sm:text-[32px] tracking-tight text-ink">Bonjour {me?.name.split(" ")[0]}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/projects" className="flex h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-[13px] font-semibold text-ink hover:bg-surface-2">
              <FolderKanban className="h-4 w-4" /> Parcourir les projets
            </Link>
            <button onClick={() => upload.open()} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[13px] font-bold text-black hover:bg-accent-hover">
              <Upload className="h-4 w-4" /> Importer une vidéo
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-7 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-card bg-surface p-4 shadow-card sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] font-semibold leading-tight text-ink-muted">{s.label}</p>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-field text-white">
                  <s.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-[28px] font-extrabold sm:text-[34px] leading-none tracking-tight text-ink tabular-nums">{s.value}</p>
              <p className="mt-2 text-xs text-ink-muted">{s.hint}</p>
            </div>
          ))}
        </div>

        {assets.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Aucune vidéo pour l'instant"
              text="Importez votre première vidéo et choisissez la marque à laquelle elle appartient. La miniature est générée automatiquement."
              onUpload={() => upload.open()}
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-8 lg:mt-9 xl:flex-row xl:gap-6">
            <div className="min-w-0 flex-1">
              {pending.length > 0 && (
                <div className="mb-10">
                  <SectionTitle title="En attente de validation" subtitle="Les dernières vidéos à relire">
                    <button onClick={() => setStatus("needs_review")} className="flex items-center gap-1 text-[13px] font-semibold text-ink hover:underline">
                      Tout voir <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </SectionTitle>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pending.map((a) => <AssetCard key={a.id} asset={a} showClient />)}
                  </div>
                </div>
              )}

              <SectionTitle title="Toutes les vidéos" subtitle={`${list.length} vidéo${list.length > 1 ? "s" : ""}`} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-auto">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher une vidéo, une marque…"
                    className="h-9 w-full rounded-lg sm:w-[270px] border border-line-strong bg-surface pl-9 pr-8 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-white"
                  />
                  {query && (
                    <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink" aria-label="Effacer">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Dropdown
                  trigger={(_, t) => (
                    <button onClick={t} className="flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-[13px] font-semibold text-ink hover:bg-surface-2">
                      {brand === "all" ? "Toutes les marques" : brands.find((b) => b.id === brand)?.name}
                      <ChevronDown className="h-4 w-4 text-ink-muted" />
                    </button>
                  )}
                  panelClassName="max-h-[320px] overflow-y-auto thin-scroll"
                >
                  {(close) => (
                    <>
                      <MenuItem active={brand === "all"} onClick={() => { setBrand("all"); close(); }}>Toutes les marques</MenuItem>
                      {brands.map((b) => (
                        <MenuItem key={b.id} active={brand === b.id} onClick={() => { setBrand(b.id); close(); }}>{b.name}</MenuItem>
                      ))}
                    </>
                  )}
                </Dropdown>
                <Dropdown
                  trigger={(_, t) => (
                    <button onClick={t} className="flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-[13px] font-semibold text-ink hover:bg-surface-2">
                      <ArrowDownAZ className="h-4 w-4 text-ink-muted" /> {SORT_LABEL[sort]} <ChevronDown className="h-4 w-4 text-ink-muted" />
                    </button>
                  )}
                >
                  {(close) => (Object.keys(SORT_LABEL) as Sort[]).map((k) => <MenuItem key={k} active={sort === k} onClick={() => { setSort(k); close(); }}>{SORT_LABEL[k]}</MenuItem>)}
                </Dropdown>
                <ViewToggle view={view} onChange={setView} className="ml-auto" />
              </div>
              <div className="mt-3"><StatusFilter value={status} onChange={setStatus} assets={scoped} /></div>
              <div className="mt-4">
                {list.length === 0 ? (
                  <EmptyState onReset={() => { setQuery(""); setStatus("all"); setBrand("all"); }} />
                ) : view === "grid" ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{list.map((a) => <AssetCard key={a.id} asset={a} showClient />)}</div>
                ) : (
                  <AssetTable assets={list} />
                )}
              </div>
            </div>

            <aside className="grid content-start gap-6 md:grid-cols-2 xl:w-[320px] xl:shrink-0 xl:grid-cols-1">
              <div className="rounded-card bg-surface p-5 shadow-card">
                <h2 className="text-[15px] font-extrabold text-ink">Activité récente</h2>
                <ul className="mt-4 space-y-4">
                  {activity.map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <Avatar userId={a.user} size={28} />
                      <Link href={`/review/${a.id}`} className="min-w-0 text-[13px] leading-snug text-ink-soft hover:underline">
                        <span className="font-bold text-ink">{userById(a.user).name}</span> {a.text} <span className="font-bold text-ink">{a.target}</span>
                        <p className="mt-0.5 text-xs text-ink-faint">{timeAgo(a.at)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-card bg-surface p-5 shadow-card">
                <h2 className="text-[15px] font-extrabold text-ink">Avancement par marque</h2>
                <ul className="mt-4 space-y-3.5">
                  {brands
                    .map((b) => {
                      const items = assets.filter((a) => a.brandId === b.id);
                      return { b, total: items.length, done: items.filter((a) => a.status === "approved").length };
                    })
                    .filter((x) => x.total > 0)
                    .sort((a, b) => b.total - a.total)
                    .map(({ b, total, done }) => (
                      <li key={b.id}>
                        <Link href={`/projects?f=${encodeURIComponent(brandFolderId(b.id))}`} className="group block">
                          <div className="flex items-center justify-between text-[13px]">
                            <span className="font-bold text-ink group-hover:underline">{b.name}</span>
                            <span className="tabular-nums text-ink-muted">{done}/{total}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-field">
                            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${(done / total) * 100}%` }} />
                          </div>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function SectionTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-[18px] font-extrabold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="text-[13px] text-ink-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
