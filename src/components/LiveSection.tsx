"use client";

import { useEffect, useState } from "react";
import { shows as fallbackShows, type Show } from "@/data/site";

const DASH = "——————";

export function LiveSection() {
  // Start from the build-time shows (from site.ts) so there's no empty flash,
  // then swap to whatever the admin has stored the moment /api/tour responds.
  const today = new Date().toISOString().slice(0, 10);
  const seed = [...fallbackShows]
    .filter((s) => s.iso >= today)
    .sort((a, b) => a.iso.localeCompare(b.iso));

  const [upcoming, setUpcoming] = useState<Show[]>(seed);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tour");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.shows)) setUpcoming(data.shows);
      } catch {
        /* keep the build-time list on any failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="live" className="px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-[67.2rem] text-center">
        <p className="eyebrow mb-12 text-[13.2px]">Live</p>

        {upcoming.length === 0 ? (
          <p className="font-display text-4xl uppercase text-grayDim sm:text-7xl">
            EP in development
          </p>
        ) : (
          <ul className="space-y-2 sm:space-y-4">
            {upcoming.map((s) => (
              <li key={s.iso + s.venue}>
                <a
                  href={s.flyerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex min-h-[44px] flex-col items-center justify-center gap-1 px-2 py-2 font-sans text-[16.8px] uppercase text-gray transition-colors hover:text-signal sm:flex-row sm:gap-4 sm:text-[19.2px] tracking-label"
                >
                  <span className="font-display text-2xl tracking-normal">
                    {s.date}
                    {s.time && (
                      <span className="text-grayDim group-hover:text-signal">
                        {" "}
                        | {s.time}
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="hidden text-grayDim group-hover:text-signal sm:inline">
                    {DASH}
                  </span>
                  <span>
                    {s.city}, {s.state}
                  </span>
                  <span aria-hidden className="hidden text-grayDim group-hover:text-signal sm:inline">
                    {DASH}
                  </span>
                  <span className="text-grayDim group-hover:text-signal">{s.venue}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}