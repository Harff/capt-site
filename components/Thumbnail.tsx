"use client";

import { useState } from "react";
import { Film } from "lucide-react";
import type { Asset } from "@/lib/types";
import { cn, duration } from "@/lib/utils";

/** Miniature réelle de la vidéo (capturée à l'import) */
export function Thumbnail({ asset, className, showDuration = true }: { asset: Asset; className?: string; showDuration?: boolean }) {
  const [failed, setFailed] = useState(false);
  const vertical = asset.aspect === "9:16" || asset.aspect === "4:5";
  return (
    <div className={cn("relative overflow-hidden bg-[#111]", className)}>
      {asset.thumb && !failed ? (
        <>
          {/* Fond flouté pour les formats verticaux */}
          {vertical && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.thumb} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.thumb}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className={cn("relative h-full w-full transition-transform duration-500 group-hover:scale-[1.03]", vertical ? "object-contain" : "object-cover")}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1d1d1d] to-[#0b0b0b]">
          <Film className="h-7 w-7 text-ink-faint" strokeWidth={1.5} />
        </div>
      )}
      {showDuration && asset.duration > 0 && (
        <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
          {duration(asset.duration)}
        </span>
      )}
    </div>
  );
}
