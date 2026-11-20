"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Menu déroulant affiché au-dessus de tout (portail), pour ne jamais être
 * coupé par une carte ou un panneau qui masque son contenu.
 */
export function Dropdown({
  trigger,
  children,
  align = "left",
  className,
  panelClassName,
  direction = "down",
}: {
  trigger: (open: boolean, toggle: () => void) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  direction?: "down" | "up";
  className?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({ visibility: "hidden" });
  const ref = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const place = () => {
    const t = ref.current?.getBoundingClientRect();
    const p = panel.current;
    if (!t || !p) return;
    const pw = p.offsetWidth;
    const ph = p.offsetHeight;
    const gap = 6;
    let left = align === "right" ? t.right - pw : t.left;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    const spaceBelow = window.innerHeight - t.bottom;
    const goUp = direction === "up" || (spaceBelow < ph + gap + 8 && t.top > spaceBelow);
    const top = goUp ? Math.max(8, t.top - ph - gap) : t.bottom + gap;
    setPos({ position: "fixed", top, left, visibility: "visible" });
  };

  useLayoutEffect(() => {
    if (open) place();
    else setPos({ visibility: "hidden" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node;
      if (ref.current?.contains(n) || panel.current?.contains(n)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onMove = () => place();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {trigger(open, () => setOpen((o) => !o))}
      {open &&
        createPortal(
          <div
            ref={panel}
            style={pos}
            onClick={(e) => e.stopPropagation()}
            className={cn("z-[200] min-w-[190px] animate-fade-in rounded-xl bg-surface-2 p-1.5 shadow-pop", panelClassName)}
          >
            {typeof children === "function" ? children(close) : children}
          </div>,
          document.body
        )}
    </div>
  );
}

export function MenuItem({ children, onClick, active, danger, icon }: { children: ReactNode; onClick?: () => void; active?: boolean; danger?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
        danger ? "text-[#ff8a7a] hover:bg-[#ff6a55]/10" : "text-ink hover:bg-surface-3",
        active && "bg-surface-3"
      )}
    >
      {icon && <span className="flex w-4 justify-center text-ink-muted">{icon}</span>}
      <span className="flex-1">{children}</span>
    </button>
  );
}

export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">{children}</p>
);
