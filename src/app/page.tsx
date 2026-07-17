import { FloatingNav } from "@/components/FloatingNav";
import { Hero } from "@/components/Hero";
import { ShirtSection } from "@/components/ShirtSection";
import { LiveSection } from "@/components/LiveSection";
import { Footer } from "@/components/Footer";
import { ChannelBug } from "@/components/ChannelBug";
import { ExitIntent } from "@/components/ExitIntent";
import { CheckoutReturn } from "@/components/CheckoutReturn";
import { BootSequence } from "@/components/BootSequence";

export default function Page() {
  return (
    <>
      {/* Channel tune-in — plays once per session, over everything */}
      <BootSequence />

      <span id="top" className="absolute top-0" />
      <FloatingNav />

      <Hero />
      <ShirtSection />
      <LiveSection />
      <Footer />

      {/* Broadcast detail + behaviors */}
      <ChannelBug />
      <ExitIntent />
      <CheckoutReturn />
    </>
  );
}
