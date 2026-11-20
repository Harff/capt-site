"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, FileVideo, Plus, UploadCloud, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { MAX_UPLOAD_BYTES } from "@/lib/supabase";
import { cn, formatBytes } from "@/lib/utils";
import { ANIMATIONS, DEFAULT_CHOICES, FONTS, POSITIONS, isHex, type AnimationKey, type CaptionChoices, type FontKey, type Position } from "@/lib/captionStyle";
import { Spinner } from "./Common";
import { Modal } from "./Modal";

type Options = { brandId?: string; campaign?: string | null; assetId?: string };
const UploadCtx = createContext<{ open: (o?: Options) => void } | null>(null);

export function useUpload() {
  const c = useContext(UploadCtx);
  if (!c) throw new Error("useUpload doit être utilisé dans <UploadProvider>");
  return c;
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const api = useMemo(() => ({ open: (o: Options = {}) => setOpts(o) }), []);
  return (
    <UploadCtx.Provider value={api}>
      {children}
      {opts && <UploadModal options={opts} onClose={() => setOpts(null)} />}
    </UploadCtx.Provider>
  );
}

const NEW_BRAND = "__new__";
const field = "h-10 w-full rounded-lg border border-line-strong bg-surface-2 px-3 text-[13.5px] text-ink outline-none placeholder:text-ink-faint focus:border-white";
const labelCls = "mb-1.5 block text-[12px] font-bold uppercase tracking-[0.06em] text-ink-muted";

function UploadModal({ options, onClose }: { options: Options; onClose: () => void }) {
  const router = useRouter();
  const { brands, assets, createBrand, createVideo, addVersion, toast } = useStore();
  const versionOf = options.assetId ? assets.find((a) => a.id === options.assetId) : undefined;

  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [brandId, setBrandId] = useState(options.brandId ?? "");
  const [newBrand, setNewBrand] = useState("");
  const [style, setStyle] = useState<CaptionChoices>(DEFAULT_CHOICES);
  const [campaign, setCampaign] = useState(options.campaign ?? "");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const campaigns = useMemo(
    () => [...new Set(assets.filter((a) => a.brandId === brandId && a.campaign).map((a) => a.campaign!))].sort(),
    [assets, brandId]
  );

  useEffect(() => {
    if (file && !title) setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim());
  }, [file, title]);

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    setError(null);
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm)$/i.test(f.name)) return setError("Ce fichier n'est pas une vidéo (MP4, MOV ou WebM).");
    if (f.size > MAX_UPLOAD_BYTES) return setError(`Fichier trop lourd (${formatBytes(f.size)}). La limite est de 50 Mo par vidéo : exportez une version allégée (H.264, 1080p).`);
    setFile(f);
  };

  const busy = progress !== null && !doneId && !error;
  const canSubmit = !!file && !busy && (versionOf ? true : !!title.trim() && (brandId === NEW_BRAND ? !!newBrand.trim() && isHex(style.textColor) && isHex(style.keywordColor) : !!brandId));

  const submit = async () => {
    if (!file || !canSubmit) return;
    setError(null);
    setProgress(0);
    try {
      if (versionOf) {
        const n = await addVersion({ assetId: versionOf.id, file, note: note.trim() || null, onProgress: setProgress });
        toast(`V${n} importée`);
        setDoneId(versionOf.id);
        return;
      }
      let bId = brandId;
      if (brandId === NEW_BRAND) {
        const b = await createBrand(newBrand, style);
        if (!b) throw new Error("Impossible de créer la marque.");
        bId = b.id;
      }
      const id = await createVideo({ brandId: bId, campaign: campaign.trim() || null, title, file, onProgress: setProgress });
      toast("Vidéo importée");
      setDoneId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'import a échoué.");
      setProgress(null);
    }
  };

  const close = () => {
    if (busy) return;
    onClose();
  };

  return (
    <Modal
      open
      onClose={close}
      title={versionOf ? "Importer une nouvelle version" : "Importer une vidéo"}
      subtitle={versionOf ? `${versionOf.title} · deviendra la V${(versionOf.versions.at(-1)?.v ?? 0) + 1}` : "La vidéo sera rangée dans le dossier de la marque choisie."}
      className="max-w-[580px]"
    >
      <div className="space-y-5 p-4 sm:p-6">
        {/* Fichier */}
        {file ? (
          <div className="flex items-center gap-3 rounded-xl border border-line-strong bg-surface-2 px-4 py-3">
            <FileVideo className="h-6 w-6 shrink-0 text-ink-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-ink">{file.name}</p>
              <p className="text-xs text-ink-muted">{formatBytes(file.size)}</p>
            </div>
            {!busy && !doneId && (
              <button onClick={() => { setFile(null); setTitle(""); }} className="rounded-md p-1 text-ink-muted hover:bg-surface-3 hover:text-ink" aria-label="Retirer">
                <X className="h-4 w-4" />
              </button>
            )}
            {doneId && <CheckCircle2 className="h-5 w-5 text-white" />}
          </div>
        ) : (
          <button
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            className={cn(
              "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed py-9 transition-colors",
              drag ? "border-white bg-surface-2" : "border-line-strong hover:border-ink-faint"
            )}
          >
            <UploadCloud className="h-8 w-8 text-white" />
            <p className="mt-3 text-[14px] font-bold text-ink">Glissez votre vidéo ici</p>
            <p className="mt-1 text-[12.5px] text-ink-muted">ou cliquez pour parcourir · MP4, MOV, WebM · 50 Mo max.</p>
          </button>
        )}
        <input ref={input} type="file" accept="video/*,.mov,.mp4,.m4v,.webm" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

        {versionOf ? (
          <div>
            <label className={labelCls} htmlFor="note">Ce qui a changé (facultatif)</label>
            <input id="note" value={note} onChange={(e) => setNote(e.target.value)} disabled={busy || !!doneId} placeholder="Ex. : corrections client intégrées, nouvel étalonnage…" className={field} />
          </div>
        ) : (
          <>
            {/* Marque */}
            <div>
              <label className={labelCls} htmlFor="brand">Marque</label>
              <div className="flex flex-wrap gap-1.5">
                {brands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={busy || !!doneId}
                    onClick={() => { setBrandId(b.id); setCampaign(options.brandId === b.id ? options.campaign ?? "" : ""); }}
                    className={cn(
                      "h-8 rounded-full border px-3 text-[12.5px] font-semibold transition-colors",
                      brandId === b.id ? "border-white bg-white text-black" : "border-line-strong text-ink-soft hover:border-ink-faint hover:text-ink"
                    )}
                  >
                    {b.name}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy || !!doneId}
                  onClick={() => setBrandId(NEW_BRAND)}
                  className={cn(
                    "flex h-8 items-center gap-1 rounded-full border border-dashed px-3 text-[12.5px] font-semibold transition-colors",
                    brandId === NEW_BRAND ? "border-white text-white" : "border-line-strong text-ink-muted hover:text-ink"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" /> Nouveau client
                </button>
              </div>
              {brandId === NEW_BRAND && (
                <>
                  <input autoFocus value={newBrand} onChange={(e) => setNewBrand(e.target.value)} disabled={busy || !!doneId} placeholder="Nom du client (ex. : Decathlon)" className={cn(field, "mt-2")} />
                  <StyleForm value={style} onChange={setStyle} disabled={busy || !!doneId} />
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="title">Titre</label>
                <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy || !!doneId} placeholder="IDEE 12 - Nom de la marque" className={field} />
              </div>
              <div>
                <label className={labelCls} htmlFor="campaign">Dossier / campagne <span className="normal-case tracking-normal text-ink-faint">(facultatif)</span></label>
                <input id="campaign" list="campaigns" value={campaign} onChange={(e) => setCampaign(e.target.value)} disabled={busy || !!doneId} placeholder="Ex. : Salve 3" className={field} />
                <datalist id="campaigns">{campaigns.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
          </>
        )}

        {progress !== null && !error && (
          <div>
            <div className="flex justify-between text-[12.5px] font-semibold">
              <span className="text-ink-soft">{doneId ? "Import terminé" : progress >= 1 ? "Finalisation…" : "Envoi en cours…"}</span>
              <span className="tabular-nums text-ink-muted">{Math.round(progress * 100)} %</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-[#3a1512] px-3 py-2.5 text-[13px] font-medium text-[#ffb4a8]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-4 py-4 sm:px-6">
        {doneId ? (
          <>
            <button onClick={onClose} className="h-10 rounded-lg px-4 text-[13px] font-semibold text-ink-soft hover:bg-surface-2">Fermer</button>
            <button
              onClick={() => { onClose(); router.push(`/review/${doneId}`); }}
              className="h-10 rounded-lg bg-white px-4 text-[13px] font-bold text-black hover:bg-accent-hover"
            >
              Ouvrir la vidéo
            </button>
          </>
        ) : (
          <>
            <button onClick={close} disabled={busy} className="h-10 rounded-lg px-4 text-[13px] font-semibold text-ink-soft hover:bg-surface-2 disabled:opacity-40">Annuler</button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[13px] font-bold text-black hover:bg-accent-hover disabled:opacity-30"
            >
              {busy && <Spinner className="h-4 w-4 border-black/20 border-t-black" />}
              {versionOf ? "Importer la version" : "Importer"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ---------------- Style de sous-titres du nouveau client ---------------- */

function ColorField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={isHex(value) ? value : "#ffffff"} onChange={(e) => onChange(e.target.value.toUpperCase())} disabled={disabled} className="h-10 w-12 cursor-pointer rounded-lg border border-line-strong bg-surface-2 p-1" aria-label={label} />
        <input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} maxLength={7} className={cn(field, "font-mono uppercase", !isHex(value) && "border-[#ffb4a8]")} />
      </div>
    </div>
  );
}

function StyleForm({ value, onChange, disabled }: { value: CaptionChoices; onChange: (v: CaptionChoices) => void; disabled?: boolean }) {
  const set = <K extends keyof CaptionChoices>(k: K, v: CaptionChoices[K]) => onChange({ ...value, [k]: v });
  const f = FONTS[value.font];
  const text = isHex(value.textColor) ? value.textColor : "#FFFFFF";
  const key = isHex(value.keywordColor) ? value.keywordColor : "#3070C8";
  const top = value.position === "haut" ? "14%" : value.position === "milieu" ? "46%" : "73%";

  return (
    <div className="mt-3 rounded-xl border border-line-strong bg-surface-2/40 p-4">
      <p className="text-[13px] font-bold text-ink">Style des sous-titres de ce client</p>
      <p className="mt-0.5 text-[12.5px] text-ink-muted">Il sera enregistré et appliqué automatiquement à toutes ses vidéos.</p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className={labelCls}>Police</label>
            <select value={value.font} onChange={(e) => set("font", e.target.value as FontKey)} disabled={disabled} className={field}>
              {(Object.keys(FONTS) as FontKey[]).map((k) => <option key={k} value={k}>{FONTS[k].label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Couleur du texte" value={value.textColor} onChange={(v) => set("textColor", v)} disabled={disabled} />
            <ColorField label="Mots mis en avant" value={value.keywordColor} onChange={(v) => set("keywordColor", v)} disabled={disabled || !value.keywords} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
            <input type="checkbox" checked={value.keywords} onChange={(e) => set("keywords", e.target.checked)} disabled={disabled} className="h-4 w-4 accent-white" />
            Mettre un mot en couleur de temps en temps
          </label>
          <div>
            <label className={labelCls}>Position</label>
            <div className="flex gap-1.5">
              {(Object.keys(POSITIONS) as Position[]).map((k) => (
                <button key={k} type="button" disabled={disabled} onClick={() => set("position", k)} className={cn("h-8 flex-1 rounded-lg border text-[12.5px] font-semibold", value.position === k ? "border-white bg-white text-black" : "border-line-strong text-ink-soft hover:text-ink")}>
                  {POSITIONS[k].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Apparition</label>
            <div className="flex gap-1.5">
              {(Object.keys(ANIMATIONS) as AnimationKey[]).map((k) => (
                <button key={k} type="button" disabled={disabled} onClick={() => set("animation", k)} title={ANIMATIONS[k].hint} className={cn("h-8 flex-1 rounded-lg border text-[12.5px] font-semibold", value.animation === k ? "border-white bg-white text-black" : "border-line-strong text-ink-soft hover:text-ink")}>
                  {ANIMATIONS[k].label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
            <input type="checkbox" checked={value.shadow} onChange={(e) => set("shadow", e.target.checked)} disabled={disabled} className="h-4 w-4 accent-white" />
            Ombre derrière le texte
          </label>
        </div>

        {/* Aperçu (format vertical). La police réelle est appliquée au rendu ; ici c'est une approximation. */}
        <div className="shrink-0">
          <p className={labelCls}>Aperçu</p>
          <div className="relative h-[250px] w-[141px] overflow-hidden rounded-lg border border-line-strong bg-gradient-to-b from-[#3b4252] to-[#14171c]">
            <p
              className="absolute inset-x-2 -translate-y-1/2 text-center text-[13px] leading-[1.15]"
              style={{ top, color: text, fontFamily: f.css, fontWeight: f.weight, textShadow: value.shadow ? "0 1px 3px rgba(0,0,0,.7)" : "none" }}
            >
              Un exemple de <span style={{ color: value.keywords ? key : text, fontSize: value.keywords ? "1.25em" : undefined }}>sous-titre</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
