"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex max-w-[520px] animate-fade-in items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold shadow-pop",
            t.error ? "bg-[#3a1512] text-[#ffb4a8]" : "bg-white text-black"
          )}
        >
          {t.error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
