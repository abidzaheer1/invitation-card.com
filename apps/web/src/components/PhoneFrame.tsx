import type { ReactNode } from "react";

/** A phone-shaped window. The content scrolls inside it like a real page would. */
export default function PhoneFrame({
  children,
  height = 640,
  width = 330,
  label = "Invitation preview",
}: {
  children: ReactNode;
  height?: number | string;
  width?: number | string;
  label?: string;
}) {
  return (
    <div
      className="relative mx-auto rounded-[2.4rem] bg-forest-deep p-[9px] ring-1 ring-white/15"
      style={{ width, maxWidth: "100%" }}
    >
      <div className="absolute left-1/2 top-[14px] z-10 h-[5px] w-16 -translate-x-1/2 rounded-full bg-black/60" aria-hidden />
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className="overflow-y-auto overscroll-contain rounded-[1.9rem] bg-white"
        style={{ height, scrollbarWidth: "none" }}
      >
        {children}
      </div>
    </div>
  );
}
