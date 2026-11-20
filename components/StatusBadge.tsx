"use client";

import { Check, ChevronDown } from "lucide-react";
import { RUNNING_META, STATUS_META, STATUS_ORDER } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dropdown, MenuLabel } from "./Dropdown";

export function StatusBadge({ status, running, className, size = "md" }: { status: Status; running?: boolean; className?: string; size?: "sm" | "md" }) {
  const m = running ? RUNNING_META : STATUS_META[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-semibold", size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs", className)}
      style={{ background: m.bg, color: m.fg }}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", running && "animate-pulse")} style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

export function StatusMenu({ assetId, status, running, align = "right" }: { assetId: string; status: Status; running?: boolean; align?: "left" | "right" }) {
  const { setStatus, toast } = useStore();
  const m = running ? RUNNING_META : STATUS_META[status];
  return (
    <Dropdown
      align={align}
      trigger={(_, toggle) => (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold transition-[filter] hover:brightness-125"
          style={{ background: m.bg, color: m.fg }}
        >
          {running && <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: m.dot }} />}
          {m.label}
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      )}
    >
      {(close) => (
        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <MenuLabel>Statut</MenuLabel>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatus([assetId], s); toast(`Statut : ${STATUS_META[s].label}`); close(); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-surface-3"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].dot }} />
              <span className="flex-1">{STATUS_META[s].label}</span>
              {s === status && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </Dropdown>
  );
}
