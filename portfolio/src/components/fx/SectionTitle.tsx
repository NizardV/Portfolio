"use client";
import Reveal from "./Reveal";

/** Numbered section heading: "01 / Projets" with a gradient rule. */
export default function SectionTitle({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <Reveal className="mb-8">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm text-cyan-300/70">{String(index).padStart(2, "0")} /</span>
        <h2 className="text-2xl font-bold md:text-3xl">{children}</h2>
      </div>
      <div className="mt-3 h-px w-full bg-gradient-to-r from-cyan-400/50 via-fuchsia-500/30 to-transparent" />
    </Reveal>
  );
}
