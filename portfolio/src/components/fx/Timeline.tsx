"use client";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import GlowCard from "./GlowCard";
import Reveal from "./Reveal";

export type TimelineEntry = {
  title: string;
  org: string;
  timeframe: string;
  location?: string;
  points?: string[];
  footer?: React.ReactNode;
};

/** Vertical timeline: a glowing rail with one card per entry, newest first. */
export default function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="relative space-y-6 border-l border-white/10 pl-6 md:pl-8">
      {entries.map((e, i) => (
        <li key={`${e.title}-${e.timeframe}`} className="relative">
          <span aria-hidden="true" className="absolute -left-[31px] top-7 flex h-3 w-3 md:-left-[39px]">
            <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400/40 blur-[3px]" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-cyan-300 bg-[#0b1020]" />
          </span>
          <Reveal delay={Math.min(i, 3) * 0.05}>
            <GlowCard className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div>
                  <h3 className="text-lg font-semibold md:text-xl">{e.title}</h3>
                  <p className="mt-1 text-sm font-medium text-white/70">{e.org}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">{e.timeframe}</Badge>
              </div>
              {e.location && (
                <p className="mt-2 flex items-center gap-2 text-xs text-white/55"><MapPin className="h-3 w-3" />{e.location}</p>
              )}
              {e.points && e.points.length > 0 && (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/70">
                  {e.points.map((pt, idx) => <li key={idx}>{pt}</li>)}
                </ul>
              )}
              {e.footer && <div className="mt-4">{e.footer}</div>}
            </GlowCard>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
