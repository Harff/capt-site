"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, title, subtitle, children, className }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} className={cn("thin-scroll max-h-[calc(100dvh-24px)] w-full max-w-[540px] animate-fade-in overflow-y-auto rounded-2xl bg-surface shadow-pop", className)}>
        <div className="flex items-start justify-between border-b border-line px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-[17px] font-extrabold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="-mr-2 rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
