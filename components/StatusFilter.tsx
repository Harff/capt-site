"use client";

import { STATUS_META, STATUS_ORDER } from "@/lib/data";
import type { Asset, Status } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusFilter({ value, onChange, assets }: { value: Status | "all"; onChange: (v: Status | "all") => void; assets: Asset[] }) {
  const count = (s: Status | "all") => (s === "all" ? assets.length : assets.filter((a) => a.status === s).length);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(["all", ...STATUS_ORDER] as (Status | "all")[]).map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition-colors",
              active ? "border-white bg-white text-black" : "border-line-strong text-ink-soft hover:border-ink-faint"
            )}
          >
            {s !== "all" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_META[s].dot }} />}
            {s === "all" ? "Tous" : STATUS_META[s].label}
            <span className={cn("tabular-nums", active ? "text-black/50" : "text-ink-faint")}>{count(s)}</span>
          </button>
        );
      })}
    </div>
  );
}
