// components/ScrollablePanel.tsx
import React from "react";

export default function ScrollablePanel({
  title,
  right,
  heightClass = "h-[60vh] md:h-[64vh] xl:h-[66vh]",
  children,
  className = "",
}: {
  title: string;
  right?: React.ReactNode;
  heightClass?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.20)] ${className}`}>
      {/* header sticky */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="ml-auto">{right}</div>
      </div>

      {/* zone scrollable */}
      <div
        className={[
          "relative overflow-y-auto overscroll-contain px-3 md:px-4 py-3",
          heightClass,
          // Scrollbars (WebKit + Firefox)
          "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent",
          "scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent",
        ].join(" ")}
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0, black 14px, black calc(100% - 14px), transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0, black 14px, black calc(100% - 14px), transparent 100%)",
        }}
      >
        {children}
      </div>
    </section>
  );
}
