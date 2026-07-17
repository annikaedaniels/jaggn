"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { site, assets } from "@/data/site";
import { Logo } from "@/components/Logo";

export function Hero() {
  const reduce = useReducedMotion();
  const rise = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <section
      id="music"
      className="h-screen-safe relative flex items-center px-5 pb-16 pt-24 sm:pb-20"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1fr_0.8fr] md:gap-12">
        <motion.div {...rise}>
          <p className="eyebrow mb-5">{site.channel} · EP</p>

          {/* The hero wordmark. With a logo configured it renders the art at a
              fluid height; until then it's the Syne type with the RGB glitch.
              The <h1> keeps the band name as real text either way, so search
              engines and screen readers still get it. */}
          {assets.logo ? (
            <h1 className="text-gray">
              <span className="sr-only">{site.band}</span>
              <span
                aria-hidden
                className="hero-logo block w-full max-w-[min(90vw,40rem)]"
              >
                <Logo height={128} className="!h-full !w-auto" />
              </span>
            </h1>
          ) : (
            <h1 className="glitch text-[clamp(3.5rem,13vw,10rem)] text-gray">
              {site.band}
            </h1>
          )}

          <p className="mt-4 max-w-md font-sans text-sm uppercase text-grayDim tracking-label">
            {site.ep.title} — out now
          </p>

          {/* LISTEN NOW → DSP links */}
          <div className="mt-9">
            <p className="eyebrow mb-3 text-signal">Listen now</p>
            <div className="flex flex-wrap gap-3">
              <a href={site.ep.spotify} target="_blank" rel="noreferrer" className="btn">
                Spotify
              </a>
              <a href={site.ep.appleMusic} target="_blank" rel="noreferrer" className="btn">
                Apple Music
              </a>
              <a href={site.ep.youtubeMusic} target="_blank" rel="noreferrer" className="btn">
                YouTube Music
              </a>
            </div>
          </div>
        </motion.div>

        {/* EP cover framed like a TV set */}
        <motion.div
          className="relative mx-auto w-full max-w-[16rem] sm:max-w-sm"
          initial={reduce ? undefined : { opacity: 0, scale: 0.96 }}
          animate={reduce ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="border border-gray/25 p-2">
            <div className="relative aspect-square overflow-hidden bg-ink">
              <Image
                src={site.ep.cover}
                alt={`${site.ep.title} cover`}
                fill
                priority
                sizes="(max-width: 768px) 90vw, 400px"
                className="object-cover"
              />
            </div>
            <div className="flex items-center justify-between px-1 pt-2 font-sans text-[10px] uppercase text-grayDim tracking-nav">
              <span>{site.band}</span>
              <span className="text-signal">CH 7700</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
