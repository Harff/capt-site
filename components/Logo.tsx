/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/** Logo Capt (PNG transparent, ratio 922×334) */
export function Logo({ variant = "white", className }: { variant?: "white" | "black"; className?: string }) {
  return <img src={`/logo-capt-${variant}.png`} alt="Capt" className={cn("h-6 w-auto select-none", className)} draggable={false} />;
}
