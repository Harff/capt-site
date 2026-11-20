"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { ROOT_ID } from "@/lib/data";
import { useStore } from "@/lib/store";
import { childFolders, cn, folderPath } from "@/lib/utils";

export function FolderTree({ currentId, className }: { currentId: string; className?: string }) {
  const { folders, assets } = useStore();
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOpen((prev) => {
      const next = new Set(prev);
      folderPath(folders, currentId).forEach((f) => next.add(f.id));
      return next;
    });
  }, [currentId, folders]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const count = (brandId: string) => assets.filter((a) => a.brandId === brandId).length;

  const renderNode = (id: string, name: string, depth: number, brandId: string) => {
    const kids = childFolders(folders, id);
    const isOpen = open.has(id);
    const active = id === currentId;
    return (
      <li key={id}>
        <div
          className={cn("group flex h-[32px] items-center rounded-md pr-2 text-[13px] transition-colors", active ? "bg-white/10 font-bold text-white" : "text-ink-soft hover:bg-surface-2")}
          style={{ paddingLeft: 6 + depth * 14 }}
        >
          <button onClick={() => toggle(id)} className={cn("flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:text-ink", !kids.length && "invisible")} aria-label={isOpen ? "Replier" : "Déplier"}>
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <Link href={`/projects?f=${encodeURIComponent(id)}`} className="flex min-w-0 flex-1 items-center gap-2 py-1 pl-1">
            <Folder className={cn("h-4 w-4 shrink-0", active ? "fill-white text-white" : "text-ink-faint")} strokeWidth={1.75} />
            <span className="truncate">{name}</span>
            {depth === 0 && <span className="ml-auto text-[11px] tabular-nums text-ink-faint">{count(brandId) || ""}</span>}
          </Link>
        </div>
        {isOpen && kids.length > 0 && <ul>{kids.map((k) => renderNode(k.id, k.name, depth + 1, k.brandId))}</ul>}
      </li>
    );
  };

  return (
    <aside className={cn("flex w-[260px] max-w-[85vw] shrink-0 flex-col border-r border-line bg-surface lg:w-[232px]", className)}>
      <p className="px-4 pb-2 pt-4 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-faint">Marques</p>
      <nav className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <Link
          href="/projects"
          className={cn("mb-0.5 flex h-[32px] items-center gap-2 rounded-md px-2 text-[13px] font-bold", currentId === ROOT_ID ? "bg-white/10 text-white" : "text-ink hover:bg-surface-2")}
        >
          <FolderOpen className="h-4 w-4" />
          Tous les projets
        </Link>
        <ul>{childFolders(folders, ROOT_ID).map((f) => renderNode(f.id, f.name, 0, f.brandId))}</ul>
      </nav>
    </aside>
  );
}
