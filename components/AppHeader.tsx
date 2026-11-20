"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Dropdown, MenuItem } from "./Dropdown";
import { Logo } from "./Logo";
import { useUpload } from "./UploadModal";

const NAV = [
  { href: "/", label: "Tableau de bord" },
  { href: "/projects", label: "Projets" },
  { href: "/reviews", label: "Révisions" },
  { href: "/team", label: "Équipe" },
];

export function AppHeader() {
  const path = usePathname();
  const { me } = useStore();
  const upload = useUpload();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="relative z-40 shrink-0 border-b border-chrome-line bg-chrome text-white">
      <div className="relative flex h-14 items-center px-3 sm:px-5">
      <Link href="/" className="flex items-center gap-3" aria-label="Accueil">
        <Logo className="h-[22px]" />
        <span className="hidden h-4 w-px bg-white/25 sm:block" />
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted sm:block">Review</span>
      </Link>

      {/* Navigation centrale (grand écran) */}
      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-chrome-line bg-chrome-deep p-1 lg:flex">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "rounded-full px-5 py-[7px] text-[13px] font-semibold transition-colors",
              isActive(n.href) ? "bg-white text-black" : "text-white/75 hover:text-white"
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => upload.open()}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[13px] font-bold text-black transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Importer
        </button>
        <Dropdown
          align="right"
          trigger={(_, toggle) => (
            <button onClick={toggle} className="ml-1 rounded-full" aria-label="Profil">
              <Avatar userId={me?.id} size={32} />
            </button>
          )}
          panelClassName="w-[250px]"
        >
          {(close) => (
            <>
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <Avatar userId={me?.id} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-ink">{me?.name}</p>
                </div>
              </div>
              <div className="my-1 h-px bg-line" />
              <Link href="/team" onClick={close}>
                <MenuItem icon={<Users className="h-4 w-4" />}>Changer mon prénom</MenuItem>
              </Link>
            </>
          )}
        </Dropdown>
      </div>
      </div>

      {/* Navigation mobile et tablette : rangée sous la barre, défilable */}
      <nav className="thin-scroll flex gap-1 overflow-x-auto px-3 pb-2.5 lg:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "shrink-0 rounded-full px-4 py-[7px] text-[13px] font-semibold transition-colors",
              isActive(n.href) ? "bg-white text-black" : "bg-chrome-deep text-white/75 hover:text-white"
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
