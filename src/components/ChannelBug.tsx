// Small broadcast "bug" in the corner — pure decoration, on-theme.
export function ChannelBug() {
  return (
    <div className="pin-bl-safe-fixed tracking-nav pointer-events-none z-50 hidden items-center gap-2 font-sans text-[10px] uppercase text-grayDim sm:flex">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-signal" />
      REC · CH 7700
    </div>
  );
}
