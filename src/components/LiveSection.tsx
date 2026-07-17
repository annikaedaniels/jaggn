import { shows } from "@/data/site";

const DASH = "——————";

export function LiveSection() {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [...shows]
    .filter((s) => s.iso >= today)
    .sort((a, b) => a.iso.localeCompare(b.iso));

  return (
    <section id="live" className="px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <p className="eyebrow mb-12">Live</p>

        {upcoming.length === 0 ? (
          <p className="font-display text-3xl uppercase text-grayDim sm:text-6xl">
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
                  className="group inline-flex min-h-[44px] flex-col items-center justify-center gap-1 px-2 py-2 font-sans text-sm uppercase text-gray transition-colors hover:text-signal sm:flex-row sm:gap-4 sm:text-base tracking-label"
                >
                  <span className="font-display text-xl tracking-normal">{s.date}</span>
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
