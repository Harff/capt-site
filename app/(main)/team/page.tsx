"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/Common";
import { useStore } from "@/lib/store";

export default function TeamPage() {
  const { users, me, loading, updateMyName, toast } = useStore();
  const [name, setName] = useState<string | null>(null);

  if (loading) return <main className="flex flex-1 items-center justify-center"><Spinner className="h-6 w-6" /></main>;

  return (
    <main className="thin-scroll min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[880px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <h1 className="text-[26px] font-extrabold sm:text-[32px] tracking-tight text-ink">Équipe</h1>
        <p className="mt-0.5 text-[13px] text-ink-muted">Le site est en accès libre : il suffit d'envoyer son adresse pour qu'une personne puisse voir et commenter les vidéos.</p>

        <section className="mt-7 rounded-card bg-surface p-5 shadow-card">
          <h2 className="text-[15px] font-extrabold">Mon prénom</h2>
          <div className="mt-4 flex items-center gap-3 sm:gap-4">
            <Avatar userId={me?.id} size={44} />
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              <input
                aria-label="Prénom affiché"
                value={name ?? me?.name ?? ""}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                className="h-10 min-w-0 flex-1 basis-40 rounded-lg border border-line-strong bg-surface-2 px-3 text-[14px] text-ink outline-none focus:border-white"
              />
              <button
                disabled={!name?.trim() || name.trim() === me?.name}
                onClick={async () => { await updateMyName(name!); setName(null); toast("Prénom mis à jour"); }}
                className="h-10 rounded-lg bg-white px-4 text-[13px] font-bold text-black hover:bg-accent-hover disabled:opacity-30"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-card bg-surface shadow-card">
          <h2 className="border-b border-line px-5 py-4 text-[15px] font-extrabold">Personnes venues sur le site ({users.length})</h2>
          <ul>
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-0">
                <Avatar userId={u.id} size={34} />
                <p className="truncate text-[14px] font-bold text-ink">
                  {u.name}
                  {u.id === me?.id && <span className="ml-2 text-xs font-semibold text-ink-faint">(vous)</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
