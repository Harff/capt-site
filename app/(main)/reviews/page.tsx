"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Search } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/Common";
import { StatusBadge } from "@/components/StatusBadge";
import { Thumbnail } from "@/components/Thumbnail";
import { useStore } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";

const TABS = [
  { id: "open", label: "En cours de révision" },
  { id: "approved", label: "Approuvées" },
  { id: "all", label: "Toutes" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const inTab = (s: string, t: Tab) => (t === "all" ? true : t === "approved" ? s === "approved" : s !== "approved");

export default function ReviewsPage() {
  const { assets, comments, loading, userById } = useStore();
  const [tab, setTab] = useState<Tab>("open");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets
      .filter((a) => inTab(a.status, tab) && (!q || a.title.toLowerCase().includes(q) || a.brandName.toLowerCase().includes(q)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [assets, tab, query]);

  if (loading) return <main className="flex flex-1 items-center justify-center"><Spinner className="h-6 w-6" /></main>;

  return (
    <main className="thin-scroll min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-ink sm:text-[32px]">Révisions</h1>
            <p className="mt-0.5 text-[13px] text-ink-muted">Suivez les validations de l'équipe, version par version.</p>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une vidéo…"
              className="h-9 w-full rounded-lg sm:w-[260px] border border-line-strong bg-surface pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-white"
            />
          </div>
        </div>

        <div className="thin-scroll mt-6 flex gap-5 overflow-x-auto border-b border-line-strong sm:gap-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn("-mb-px flex shrink-0 items-center gap-2 border-b-2 pb-3 text-[13.5px] font-bold transition-colors", tab === t.id ? "border-white text-white" : "border-transparent text-ink-muted hover:text-ink")}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", tab === t.id ? "bg-white text-black" : "bg-surface-2 text-ink-muted")}>{assets.filter((a) => inTab(a.status, t.id)).length}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {rows.map((a) => {
            const cs = comments.filter((c) => c.assetId === a.id);
            const resolved = cs.filter((c) => c.resolved).length;
            const latest = a.versions[a.versions.length - 1];
            return (
              <Link key={a.id} href={`/review/${a.id}`} className="group flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card bg-surface p-3 shadow-card transition-shadow hover:shadow-card-hover md:flex-nowrap md:pr-5">
                <Thumbnail asset={a} className="h-[56px] w-[100px] shrink-0 rounded-lg sm:h-[68px] sm:w-[120px]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[14px] font-bold text-ink">{a.title}</p>
                    {latest && <span className="rounded-md bg-field px-1.5 py-0.5 text-[11px] font-bold text-ink-soft">V{latest.v}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {a.brandName}
                    {a.campaign ? ` › ${a.campaign}` : ""} · mise à jour {timeAgo(a.updatedAt)}
                  </p>
                </div>
                <div className="hidden w-[170px] md:block">
                  <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">Validation</p>
                  {a.status === "approved" ? (
                    <div className="flex min-w-0 items-center gap-1.5">
                      {a.approvedBy[0] && (
                        <span className="relative shrink-0">
                          <Avatar userId={a.approvedBy[0]} size={24} />
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white text-black ring-2 ring-surface">
                            <Check className="h-2 w-2" strokeWidth={4} />
                          </span>
                        </span>
                      )}
                      <span className="truncate text-xs text-ink-soft">{a.approvedBy[0] ? userById(a.approvedBy[0]).name : "Approuvée"}</span>
                      <span className="ml-auto text-xs tabular-nums text-ink-muted">1/1</span>
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted">En attente · 0/1</p>
                  )}
                </div>
                <div className="w-[150px] md:block">
                  <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">Commentaires</p>
                  {cs.length ? (
                    <>
                      <p className="text-xs text-ink-soft"><span className="font-bold text-ink">{resolved}</span> / {cs.length} résolus</p>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-field"><div className="h-full bg-white" style={{ width: `${(resolved / cs.length) * 100}%` }} /></div>
                    </>
                  ) : (
                    <p className="text-xs text-ink-faint">Aucun</p>
                  )}
                </div>
                <div className="ml-auto text-right md:ml-0 md:w-[170px]"><StatusBadge status={a.status} running={a.running} /></div>
                <ArrowUpRight className="hidden h-4 w-4 text-ink-faint transition-colors group-hover:text-white md:block" />
              </Link>
            );
          })}
          {rows.length === 0 && <p className="py-16 text-center text-[13px] text-ink-muted">Aucune vidéo dans cet onglet.</p>}
        </div>
      </div>
    </main>
  );
}
