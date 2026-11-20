"use client";

import { LayoutGrid, List, Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function ViewToggle({ view, onChange, className }: { view: "grid" | "list"; onChange: (v: "grid" | "list") => void; className?: string }) {
  return (
    <div className={cn("flex h-9 items-center rounded-lg bg-surface p-1 shadow-card", className)}>
      {(["grid", "list"] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn("flex h-7 w-8 items-center justify-center rounded-md transition-colors", view === v ? "bg-white text-black" : "text-ink-muted hover:text-ink")}
          aria-label={v === "grid" ? "Vue grille" : "Vue liste"}
        >
          {v === "grid" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  onReset,
  onUpload,
  title = "Aucune vidéo ne correspond",
  text = "Essayez un autre mot-clé ou réinitialisez les filtres.",
}: {
  onReset?: () => void;
  onUpload?: () => void;
  title?: string;
  text?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line-strong py-16 text-center">
      {onUpload ? <Upload className="h-6 w-6 text-ink-faint" /> : <Search className="h-6 w-6 text-ink-faint" />}
      <p className="mt-3 text-[14px] font-bold text-ink">{title}</p>
      <p className="mt-1 max-w-[380px] text-[13px] text-ink-muted">{text}</p>
      {onReset && (
        <button onClick={onReset} className="mt-4 h-8 rounded-lg border border-line-strong px-3 text-[13px] font-semibold text-ink hover:bg-surface-2">
          Réinitialiser
        </button>
      )}
      {onUpload && (
        <button onClick={onUpload} className="mt-4 flex h-9 items-center gap-2 rounded-lg bg-white px-4 text-[13px] font-bold text-black hover:bg-accent-hover">
          <Upload className="h-4 w-4" /> Importer une vidéo
        </button>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white", className)} />;
}
