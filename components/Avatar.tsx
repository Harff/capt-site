"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Avatar({ userId, size = 24, ring = false, className }: { userId: string | null | undefined; size?: number; ring?: boolean; className?: string }) {
  const u = useStore().userById(userId);
  return (
    <span
      title={u.name}
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold", ring && "ring-2 ring-surface", className)}
      style={{ width: size, height: size, background: u.bg, color: u.fg, fontSize: Math.max(9, size * 0.4) }}
    >
      {u.initials}
    </span>
  );
}

export function AvatarStack({ ids, size = 24, max = 4 }: { ids: string[]; size?: number; max?: number }) {
  return (
    <span className="flex -space-x-1.5">
      {ids.slice(0, max).map((id) => (
        <Avatar key={id} userId={id} size={size} ring />
      ))}
      {ids.length > max && (
        <span className="inline-flex items-center justify-center rounded-full bg-field text-[10px] font-semibold text-ink-muted ring-2 ring-surface" style={{ width: size, height: size }}>
          +{ids.length - max}
        </span>
      )}
    </span>
  );
}
