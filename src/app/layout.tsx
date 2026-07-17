import type { Metadata, Viewport } from "next";
import { Syne, Inter } from "next/font/google";
import { site } from "@/data/site";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const display = Syne({
  weight: ["700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${site.band} — ${site.channel}`,
  description: `${site.band}. ${site.ep.title}. Out now.`,
  openGraph: {
    title: `${site.band} — ${site.channel}`,
    description: `${site.ep.title} — out now.`,
    type: "website",
  },
  metadataBase: new URL("https://jaggn.com"),
};

export const viewport: Viewport = {
  // viewport-fit=cover lets the page paint under the notch / Dynamic Island /
  // home indicator; we then inset content with env(safe-area-inset-*) in CSS.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // Paints the iOS/Android browser chrome to match the page.
  themeColor: "#0D0D0D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen">
        <ToastProvider>{children}</ToastProvider>
        {/* Broadcast overlays sit above content but never block clicks */}
        <div className="crt-vignette" aria-hidden />
        <div className="tv-static" aria-hidden />
        <div className="scan-sweep" aria-hidden />
      </body>
    </html>
  );
}
