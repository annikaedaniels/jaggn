import { site } from "@/data/site";

// Horizontal broadcast ticker — leans into the Channel 7700 theme.
export function Ticker() {
  const phrase = `${site.ep.title} · OUT NOW · ${site.channel} · NOW BROADCASTING · `;
  const run = phrase.repeat(4);

  return (
    <div className="overflow-hidden border-y border-gray/15 bg-ink/60 py-2">
      <div className="flex w-max animate-ticker whitespace-nowrap font-sans text-[11px] uppercase text-grayDim tracking-nav">
        <span>{run}</span>
        <span aria-hidden>{run}</span>
      </div>
    </div>
  );
}
