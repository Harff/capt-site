"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { Spinner } from "./Common";
import { Logo } from "./Logo";

/** Accès libre : on demande seulement un prénom à la première visite, pour signer les commentaires */
export function AuthGate({ children }: { children: ReactNode }) {
  const { authReady, session, loading, needsName } = useStore();

  if (!authReady || (session && loading)) {
    return (
      <Screen>
        <Spinner className="h-6 w-6" />
      </Screen>
    );
  }
  if (!session) {
    return (
      <Screen>
        <h1 className="text-[22px] font-extrabold">Site momentanément indisponible</h1>
        <p className="mt-2 max-w-[360px] text-center text-[14px] text-ink-muted">Rechargez la page dans quelques instants.</p>
      </Screen>
    );
  }
  if (needsName) return <AskName />;
  return <>{children}</>;
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-black px-6 text-white">
      {/* Arc lumineux, clin d'œil au site Capt */}
      <div className="pointer-events-none absolute left-1/2 top-[18%] h-[1100px] w-[1100px] -translate-x-1/2 rounded-full border border-white/25 shadow-[0_0_120px_rgba(255,255,255,0.06)_inset]" />
      <div className="relative flex flex-col items-center">{children}</div>
    </div>
  );
}

function AskName() {
  const { updateMyName } = useStore();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await updateMyName(name);
    setBusy(false);
  };

  return (
    <Screen>
      <Logo className="h-12" />
      <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.3em] text-ink-muted">Espace révision</p>
      <h1 className="capt-gradient-text mt-10 text-center text-[34px] font-extrabold sm:text-[44px] leading-[1.05] tracking-tight">
        Validez vos vidéos,
        <br />
        image par image.
      </h1>
      <form onSubmit={submit} className="mt-10 w-full max-w-[380px]">
        <label htmlFor="name" className="text-[12px] font-semibold text-ink-muted">Votre prénom (pour signer vos commentaires)</label>
        <input
          id="name"
          autoFocus
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Camille"
          className="mt-1.5 h-12 w-full rounded-lg border border-line-strong bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-white"
        />
        <button
          disabled={busy || !name.trim()}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-[14px] font-bold text-black transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? <Spinner className="h-4 w-4 border-black/20 border-t-black" /> : <>Entrer <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </Screen>
  );
}
