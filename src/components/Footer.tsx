import { site, socials } from "@/data/site";
import { EmailSignup } from "@/components/EmailSignup";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  MailIcon,
} from "@/components/Icons";

const icons = [
  { href: socials.instagram, label: "Instagram", Icon: InstagramIcon, ext: true },
  { href: socials.tiktok, label: "TikTok", Icon: TikTokIcon, ext: true },
  { href: socials.youtube, label: "YouTube", Icon: YouTubeIcon, ext: true },
  { href: socials.email, label: "Email", Icon: MailIcon, ext: false },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="pad-safe-bottom border-t border-gray/15 px-5 py-14 sm:py-16">
      <div className="mx-auto max-w-4xl text-center">
        <h3 className="text-3xl text-gray sm:text-4xl">Don&apos;t miss a signal</h3>
        <p className="eyebrow mt-3 mb-7">Join the mailing list</p>

        <EmailSignup />

        {/* Social row (Citizen-style) */}
        <div className="mt-12 flex items-center justify-center gap-5 sm:mt-14 sm:gap-7">
          {icons.map(({ href, label, Icon, ext }) => (
            <a
              key={label}
              href={href}
              {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}
              aria-label={label}
              className="tap justify-center px-2 text-gray transition-colors hover:text-signal"
            >
              <Icon className="h-6 w-6" />
            </a>
          ))}
        </div>

        <p className="mt-12 font-sans text-[11px] uppercase text-grayDim tracking-nav">
          © {year} {site.band} · {site.channel}
        </p>
      </div>
    </footer>
  );
}
