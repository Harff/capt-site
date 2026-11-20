"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Clock, MapPin, MessageSquareDashed, MoreHorizontal, Pencil, Search, SendHorizontal, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Dropdown, MenuItem } from "@/components/Dropdown";
import { useStore } from "@/lib/store";
import type { Comment } from "@/lib/types";
import { cn, timeAgo, timecode } from "@/lib/utils";

type Sort = "time" | "recent";
type Filter = "all" | "open" | "resolved";

export type CommentsPanelHandle = { focusComposer: () => void };

/* ------------------------------------------------------------------ */

export function ResolveBox({ resolved, onToggle, size = "md" }: { resolved: boolean; onToggle: () => void; size?: "sm" | "md" }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={resolved ? "Rouvrir" : "Marquer comme résolu"}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border transition-colors",
        size === "sm" ? "h-7 w-7" : "h-[34px] w-[34px]",
        resolved ? "border-white bg-white text-black" : "border-line-strong bg-surface text-ink-faint hover:border-white hover:text-white"
      )}
    >
      <Check className="h-4 w-4" strokeWidth={2.5} />
    </button>
  );
}

export function ReplyBox({ onSend, onResolve, resolved, autoFocus }: { onSend: (t: string) => void; onResolve: () => void; resolved: boolean; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder="Répondre au fil…"
        className="h-[34px] min-w-0 flex-1 rounded-md bg-field px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:bg-surface-3 focus:ring-1 focus:ring-white"
      />
      <ResolveBox resolved={resolved} onToggle={onResolve} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CommentItem({
  c,
  src,
  active,
  onSelect,
}: {
  c: Comment;
  src: string;
  active: boolean;
  onSelect: (c: Comment) => void;
}) {
  const { addReply, toggleResolved, deleteComment, editComment, userById, me } = useStore();
  const u = userById(c.authorId);
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.text);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <div
      ref={ref}
      onClick={() => onSelect(c)}
      className={cn(
        "relative cursor-pointer border-b border-line px-4 py-3.5 transition-colors",
        active ? "bg-surface-2" : "hover:bg-surface-2",
        c.resolved && !active && "opacity-60"
      )}
    >
      {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-white" />}

      <div className="flex items-center gap-2">
        <Avatar userId={c.authorId} size={22} />
        <span className="text-[13px] font-semibold text-ink">{u.name}</span>
        <span className="text-xs text-ink-faint">{timeAgo(c.createdAt)}</span>
        {c.resolved && (
          <span className="flex items-center gap-0.5 rounded bg-field px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-soft">
            <Check className="h-3 w-3" strokeWidth={3} /> Résolu
          </span>
        )}
        <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
          <Dropdown
            align="right"
            trigger={(_, t) => (
              <button onClick={t} className="rounded p-0.5 text-ink-faint hover:bg-surface-3 hover:text-ink" aria-label="Options">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          >
            {(close) => (
              <>
                {c.authorId === me?.id && (
                  <MenuItem icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { setEditing(true); close(); }}>
                    Modifier
                  </MenuItem>
                )}
                <MenuItem icon={<Check className="h-3.5 w-3.5" />} onClick={() => { toggleResolved(c.id); close(); }}>
                  {c.resolved ? "Rouvrir" : "Marquer comme résolu"}
                </MenuItem>
                <MenuItem
                  danger
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => { deleteComment(c.id); close(); }}
                >
                  Supprimer
                </MenuItem>
              </>
            )}
          </Dropdown>
        </div>
      </div>

      <div className="mt-2.5 flex gap-3">
        {c.time !== null && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(c);
            }}
            className="group/tc relative h-[54px] w-[80px] shrink-0 overflow-hidden rounded-md bg-black"
            title="Aller à ce timecode"
          >
            <video src={`${src}#t=${c.time}`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[10px] font-semibold tabular-nums text-white group-hover/tc:bg-black">
              {timecode(c.time)}
            </span>
            {c.x !== undefined && (
              <span className="absolute right-1 top-1 rounded-full bg-surface/90 p-0.5 text-white">
                <MapPin className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
        )}
        {editing ? (
          <div className="flex-1" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={3}
              className="w-full resize-none rounded-md border border-white px-2 py-1.5 text-[13px] outline-none"
            />
            <div className="mt-1 flex justify-end gap-1">
              <button onClick={() => setEditing(false)} className="h-7 rounded-md px-2 text-xs font-semibold text-ink-soft hover:bg-surface-3">Annuler</button>
              <button
                onClick={() => { editComment(c.id, draft.trim() || c.text); setEditing(false); }}
                className="h-7 rounded-md bg-white px-2.5 text-xs font-semibold text-black"
              >
                Enregistrer
              </button>
            </div>
          </div>
        ) : (
          <p className={cn("min-w-0 flex-1 whitespace-pre-wrap text-[13.5px] leading-snug text-ink", c.resolved && "line-through decoration-ink-faint")}>
            {c.time === null && (
              <span className="mr-1.5 inline-flex rounded bg-field px-1 py-px align-[1px] text-[10.5px] font-semibold text-ink-muted">Général</span>
            )}
            {c.text}
          </p>
        )}
      </div>

      {c.replies.length > 0 && (
        <ul className="mt-3 space-y-2.5 border-l-2 border-line pl-3">
          {c.replies.map((r) => (
            <li key={r.id}>
              <div className="flex items-center gap-1.5">
                <Avatar userId={r.authorId} size={18} />
                <span className="text-[12.5px] font-semibold text-ink">{userById(r.authorId).name}</span>
                <span className="text-[11px] text-ink-faint">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-ink-soft">{r.text}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <ReplyBox onSend={(t) => addReply(c.id, t)} onResolve={() => toggleResolved(c.id)} resolved={c.resolved} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export const CommentsPanel = forwardRef<
  CommentsPanelHandle,
  {
    comments: Comment[];
    src: string;
    current: number;
    activeId: string | null;
    pendingTime: number | null;
    onSelect: (c: Comment) => void;
    onSubmit: (text: string, time: number | null) => void;
    onCancelPending: () => void;
  }
>(function CommentsPanel({ comments, src, current, activeId, pendingTime, onSelect, onSubmit, onCancelPending }, ref) {
  const { userById, me } = useStore();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("time");
  const [filter, setFilter] = useState<Filter>("all");
  const [text, setText] = useState("");
  const [withTime, setWithTime] = useState(true);
  const input = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({ focusComposer: () => input.current?.focus() }));

  const resolvedCount = comments.filter((c) => c.resolved).length;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return comments
      .filter((c) => (filter === "all" ? true : filter === "open" ? !c.resolved : c.resolved))
      .filter((c) => !q || c.text.toLowerCase().includes(q) || userById(c.authorId).name.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === "time" ? (a.time ?? Infinity) - (b.time ?? Infinity) : b.createdAt.localeCompare(a.createdAt)
      );
  }, [comments, query, sort, filter]);

  const time = pendingTime ?? current;
  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), withTime || pendingTime !== null ? time : null);
    setText("");
  };

  return (
    <section className="flex min-h-0 w-full flex-col bg-surface lg:w-[392px] lg:shrink-0 lg:border-l lg:border-line">
      <header className="shrink-0 border-b border-line px-4 pb-3 pt-4">
        <h2 className="text-[19px] font-bold text-ink">Commentaires</h2>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher"
              className="h-8 w-full rounded-md bg-field pl-8 pr-2 text-[13px] outline-none placeholder:text-ink-faint focus:bg-surface-3 focus:ring-1 focus:ring-white"
            />
          </div>
          <Dropdown
            align="right"
            trigger={(_, t) => (
              <button onClick={t} className="flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold text-ink hover:bg-surface-3">
                {sort === "time" ? "Timecode" : "Récents"} <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem active={sort === "time"} onClick={() => { setSort("time"); close(); }}>Par timecode</MenuItem>
                <MenuItem active={sort === "recent"} onClick={() => { setSort("recent"); close(); }}>Plus récents</MenuItem>
              </>
            )}
          </Dropdown>
          <Dropdown
            align="right"
            trigger={(_, t) => (
              <button
                onClick={t}
                className={cn("flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold hover:bg-surface-3", filter !== "all" ? "text-white ring-1 ring-white" : "text-ink")}
                title="Commentaires résolus"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                {resolvedCount} sur {comments.length}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem active={filter === "all"} onClick={() => { setFilter("all"); close(); }}>Tous les commentaires</MenuItem>
                <MenuItem active={filter === "open"} onClick={() => { setFilter("open"); close(); }}>Non résolus</MenuItem>
                <MenuItem active={filter === "resolved"} onClick={() => { setFilter("resolved"); close(); }}>Résolus</MenuItem>
              </>
            )}
          </Dropdown>
        </div>
      </header>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <MessageSquareDashed className="h-8 w-8 text-ink-faint" />
            <p className="mt-3 text-[14px] font-semibold text-ink">{comments.length ? "Aucun commentaire ne correspond" : "Aucun commentaire pour l'instant"}</p>
            <p className="mt-1 text-[13px] leading-snug text-ink-muted">
              Cliquez sur l'image ou sur la piste au-dessus de la timeline pour déposer une note horodatée.
            </p>
          </div>
        ) : (
          list.map((c) => <CommentItem key={c.id} c={c} src={src} active={c.id === activeId} onSelect={onSelect} />)
        )}
      </div>

      {/* Zone de saisie */}
      <footer className="shrink-0 border-t border-line p-3">
        <div className={cn("rounded-xl border bg-surface transition-colors", pendingTime !== null ? "border-white" : "border-line-strong focus-within:border-white")}>
          <textarea
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") onCancelPending();
            }}
            rows={2}
            placeholder="Laisser un commentaire…"
            className="block w-full resize-none rounded-t-xl px-3 pt-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-faint"
          />
          <div className="flex items-center gap-2 px-2 pb-2">
            <Avatar userId={me?.id} size={22} />
            <button
              onClick={() => (pendingTime !== null ? onCancelPending() : setWithTime((w) => !w))}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold tabular-nums transition-colors",
                withTime || pendingTime !== null ? "bg-white text-black" : "bg-field text-ink-muted line-through"
              )}
              title={pendingTime !== null ? "Retirer ce timecode" : "Associer au timecode courant"}
            >
              <Clock className="h-3.5 w-3.5" />
              {timecode(time)}
              {pendingTime !== null && <X className="h-3 w-3" />}
            </button>
            <span className="text-[11px] text-ink-faint">⏎ pour envoyer</span>
            <button
              onClick={submit}
              disabled={!text.trim()}
              className="ml-auto flex h-7 items-center gap-1.5 rounded-md bg-white px-2.5 text-[12.5px] font-semibold text-black disabled:opacity-25"
            >
              Envoyer <SendHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </footer>
    </section>
  );
});
