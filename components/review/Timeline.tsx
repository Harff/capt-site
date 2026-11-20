"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Comment } from "@/lib/types";
import { cn, timecode } from "@/lib/utils";

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/**
 * Timeline :
 *  - piste supérieure = marqueurs de commentaires (clic = nouveau commentaire à ce timecode)
 *  - barre = position de lecture (clic / glisser = navigation)
 */
export function Timeline({
  current,
  duration,
  buffered,
  comments,
  activeId,
  onSeek,
  onAddAt,
  onMarker,
}: {
  current: number;
  duration: number;
  buffered: number;
  comments: Comment[];
  activeId: string | null;
  onSeek: (t: number) => void;
  onAddAt: (t: number) => void;
  onMarker: (c: Comment) => void;
}) {
  const { userById } = useStore();
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ p: number; lane: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const pFrom = (clientX: number) => {
    const r = wrap.current!.getBoundingClientRect();
    return clamp((clientX - r.left) / r.width, 0, 1);
  };

  const pct = duration ? (current / duration) * 100 : 0;
  const markers = comments.filter((c) => c.time !== null);

  return (
    <div className="min-w-0 flex-1 select-none">
      <div ref={wrap} className="relative">
        {/* Piste des marqueurs */}
        <div
          className="relative h-5 cursor-copy"
          onMouseMove={(e) => setHover({ p: pFrom(e.clientX), lane: true })}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => duration && onAddAt(pFrom(e.clientX) * duration)}
        >
          {hover?.lane && duration > 0 && (
            <span
              className="pointer-events-none absolute top-1/2 flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-dashed border-white/50 bg-surface text-white"
              style={{ left: `${hover.p * 100}%` }}
            >
              <Plus className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
          )}
          {duration > 0 &&
            markers.map((c) => {
              const u = userById(c.authorId);
              const active = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarker(c);
                  }}
                  onMouseMove={(e) => e.stopPropagation()}
                  onMouseEnter={() => setHover(null)}
                  title={`${u.name} · ${timecode(c.time!)}\n${c.text}`}
                  className={cn(
                    "absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface transition-transform hover:scale-125",
                    active && "scale-125 !ring-white",
                    c.resolved && "opacity-40"
                  )}
                  style={{ left: `${(Math.min(c.time!, duration) / duration) * 100}%`, background: u.fg }}
                  aria-label={`Commentaire de ${u.name} à ${timecode(c.time!)}`}
                />
              );
            })}
        </div>

        {/* Barre de lecture */}
        <div
          className="group relative flex h-4 cursor-pointer items-center"
          onPointerDown={(e) => {
            if (!duration) return;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            setDragging(true);
            onSeek(pFrom(e.clientX) * duration);
          }}
          onPointerMove={(e) => {
            setHover({ p: pFrom(e.clientX), lane: false });
            if (dragging) onSeek(pFrom(e.clientX) * duration);
          }}
          onPointerUp={() => setDragging(false)}
          onMouseLeave={() => !dragging && setHover(null)}
        >
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#2e2e2e]">
            <div className="absolute inset-y-0 left-0 bg-[#4a4a4a]" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
            <div className="absolute inset-y-0 left-0 bg-white" style={{ width: `${pct}%` }} />
          </div>
          <span
            className={cn(
              "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-[3px] ring-black transition-transform",
              dragging ? "scale-110" : "scale-0 group-hover:scale-100"
            )}
            style={{ left: `${pct}%` }}
          />
        </div>

        {/* Info-bulle timecode */}
        {hover && duration > 0 && (
          <span
            className="pointer-events-none absolute -top-8 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-semibold tabular-nums text-black"
            style={{ left: `${hover.p * 100}%` }}
          >
            {hover.lane ? "Commenter à " : ""}
            {timecode(hover.p * duration)}
          </span>
        )}
      </div>

      <div className="mt-0.5 flex justify-between text-[11px] font-medium tabular-nums text-ink-muted">
        <span>{timecode(current)}</span>
        <span>{timecode(duration)}</span>
      </div>
    </div>
  );
}
