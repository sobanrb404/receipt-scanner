import { Receipt } from "lucide-react";

/** The app's mark: a receipt icon with a light beam sweeping down over it
 * on a loop — literally shows what the app does (scans a receipt), rather
 * than an arbitrary decorative animation. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="relative shrink-0 rounded-md bg-[var(--color-teal-soft)] overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Receipt size={size * 0.62} strokeWidth={2} className="text-[var(--color-teal)]" />
      <div
        className="animate-logo-scan absolute left-0 right-0 h-[35%] pointer-events-none"
        style={{
          // rgba, not color-mix() + a CSS var — broader browser support and
          // no dependency on the custom property resolving inside a
          // color-mix() context.
          background: "linear-gradient(to bottom, transparent, rgba(47, 122, 111, 0.55), transparent)",
        }}
      />
    </div>
  );
}
