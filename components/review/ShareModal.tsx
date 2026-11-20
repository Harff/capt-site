"use client";

import { useState } from "react";
import { Check, Copy, Globe, Link2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import type { Asset } from "@/lib/types";

export function ShareModal({ open, onClose, asset, version }: { open: boolean; onClose: () => void; asset: Asset; version: number }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/review/${asset.id}` : "";

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Partager « ${asset.title} »`} subtitle={`V${version} · ${asset.brandName}`} className="max-w-[540px]">
      <div className="space-y-5 p-6">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">Lien de la vidéo</label>
          <div className="mt-1.5 flex gap-2">
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-2 px-3">
              <Link2 className="h-4 w-4 shrink-0 text-ink-muted" />
              <span className="truncate text-[13px] text-ink-soft">{link}</span>
            </div>
            <button onClick={copy} className="flex h-10 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[13px] font-bold text-black hover:bg-accent-hover">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
            <Globe className="h-3.5 w-3.5" /> Toute personne qui a ce lien peut voir la vidéo et la commenter.
          </p>
        </div>

      </div>
      <div className="flex justify-end border-t border-line px-6 py-4">
        <button onClick={onClose} className="h-9 rounded-lg bg-white px-4 text-[13px] font-bold text-black hover:bg-accent-hover">Terminé</button>
      </div>
    </Modal>
  );
}
