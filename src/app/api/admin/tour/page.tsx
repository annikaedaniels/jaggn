"use client";

import { useCallback, useEffect, useState } from "react";
import type { Show } from "@/data/site";

// ─────────────────────────────────────────────────────────────
//  /admin — password-gated tour editor.
//
//  The password is kept only in React state for the session (never in
//  localStorage — a shared machine shouldn't leak it) and sent as a Bearer
//  header on every request. All validation and storage happen server-side;
//  this page is just the form.
// ─────────────────────────────────────────────────────────────

type Draft = Omit<Show, "date">; // date is derived server-side from iso

const empty: Draft = {
  iso: "",
  time: "",
  city: "",
  state: "",
  venue: "",
  flyerUrl: "",
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [shows, setShows] = useState<Show[]>([]);
  const [draft, setDraft] = useState<Draft>(empty);
  const [editingIso, setEditingIso] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (pw: string) => {
      setBusy(true);
      setStatus("");
      try {
        const res = await fetch("/api/admin/tour", {
          headers: { Authorization: `Bearer ${pw}` },
        });
        if (res.status === 401) {
          setStatus("Wrong password.");
          return false;
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setStatus(d.error ?? "Couldn't load.");
          return false;
        }
        const data = await res.json();
        setShows(data.shows ?? []);
        return true;
      } catch {
        setStatus("Network error.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (await load(password)) setAuthed(true);
  }

  // Persist the full list after any add / edit / delete.
  async function persist(next: Show[]) {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/tour", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${password}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shows: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Save failed.");
        return;
      }
      setShows(data.shows ?? next);
      setStatus("Saved.");
    } catch {
      setStatus("Network error.");
    } finally {
      setBusy(false);
    }
  }

  function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.iso)) {
      setStatus("Pick a date.");
      return;
    }
    if (!draft.city.trim() || !draft.venue.trim()) {
      setStatus("City and venue are required.");
      return;
    }
    // date is filled in by the server; placeholder here keeps the type happy.
    const row: Show = { ...draft, date: "" };
    const rest = shows.filter((s) => s.iso !== (editingIso ?? draft.iso));
    persist([...rest, row]);
    setDraft(empty);
    setEditingIso(null);
  }

  function edit(s: Show) {
    setDraft({
      iso: s.iso,
      time: s.time,
      city: s.city,
      state: s.state,
      venue: s.venue,
      flyerUrl: s.flyerUrl,
    });
    setEditingIso(s.iso);
    setStatus("");
  }

  function remove(iso: string) {
    persist(shows.filter((s) => s.iso !== iso));
    if (editingIso === iso) {
      setDraft(empty);
      setEditingIso(null);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const field =
    "w-full border border-gray/40 bg-transparent px-3 py-2 font-sans text-base text-gray placeholder:text-grayDim/60 focus:border-signal";

  // ── Password gate ──
  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
        <h1 className="mb-2 font-display text-4xl uppercase text-gray">Admin</h1>
        <p className="eyebrow mb-6">Tour dates</p>
        <form onSubmit={unlock} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Admin password"
            autoFocus
            className={field}
          />
          <button type="submit" disabled={busy} className="btn btn-solid disabled:opacity-50">
            {busy ? "…" : "Unlock"}
          </button>
        </form>
        {status && <p className="mt-3 font-sans text-xs uppercase text-signal tracking-label">{status}</p>}
      </main>
    );
  }

  // ── Editor ──
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16">
      <h1 className="font-display text-5xl uppercase text-gray">Tour</h1>
      <p className="eyebrow mb-10">
        {editingIso ? "Editing show" : "Add a show"}
      </p>

      <form onSubmit={submitDraft} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="eyebrow">Date</span>
            <input
              type="date"
              value={draft.iso}
              onChange={(e) => setDraft({ ...draft, iso: e.target.value })}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="eyebrow">Time</span>
            <input
              value={draft.time}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
              placeholder="8:00 PM"
              className={field}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <label className="flex flex-col gap-1">
            <span className="eyebrow">City</span>
            <input
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              placeholder="ORLANDO"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="eyebrow">State</span>
            <input
              value={draft.state}
              onChange={(e) => setDraft({ ...draft, state: e.target.value })}
              placeholder="FL"
              className={field}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="eyebrow">Venue</span>
          <input
            value={draft.venue}
            onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
            placeholder="MY SISTER'S HOUSE"
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="eyebrow">Flyer link (Instagram)</span>
          <input
            value={draft.flyerUrl}
            onChange={(e) => setDraft({ ...draft, flyerUrl: e.target.value })}
            placeholder="https://instagram.com/p/…"
            className={field}
          />
        </label>

        <div className="mt-2 flex items-center gap-3">
          <button type="submit" disabled={busy} className="btn btn-solid disabled:opacity-50">
            {editingIso ? "Save changes" : "Add show"}
          </button>
          {editingIso && (
            <button
              type="button"
              onClick={() => {
                setDraft(empty);
                setEditingIso(null);
              }}
              className="btn"
            >
              Cancel
            </button>
          )}
          {status && (
            <span className="font-sans text-xs uppercase text-grayDim tracking-label">
              {status}
            </span>
          )}
        </div>
      </form>

      {/* Current list */}
      <h2 className="mt-14 mb-4 font-display text-2xl uppercase text-gray">
        All shows
      </h2>
      {shows.length === 0 ? (
        <p className="font-sans text-sm text-grayDim">No shows yet.</p>
      ) : (
        <ul className="divide-y divide-gray/15 border-y border-gray/15">
          {[...shows]
            .sort((a, b) => a.iso.localeCompare(b.iso))
            .map((s) => {
              const past = s.iso < today;
              return (
                <li
                  key={s.iso}
                  className="flex items-center gap-4 py-3 font-sans text-sm"
                >
                  <span className={past ? "text-grayDim line-through" : "text-gray"}>
                    {s.date || s.iso} {s.time && `| ${s.time}`} — {s.city}
                    {s.state && `, ${s.state}`} — {s.venue}
                    {past && (
                      <span className="ml-2 text-[10px] uppercase text-grayDim tracking-label">
                        (past — hidden on site)
                      </span>
                    )}
                  </span>
                  <span className="ml-auto flex shrink-0 gap-2">
                    <button onClick={() => edit(s)} className="navlink tap">
                      Edit
                    </button>
                    <button
                      onClick={() => remove(s.iso)}
                      className="tap font-sans text-xs uppercase text-grayDim transition-colors hover:text-signal tracking-nav"
                    >
                      Delete
                    </button>
                  </span>
                </li>
              );
            })}
        </ul>
      )}
    </main>
  );
}