"use client";
import SkillBadge from "@/components/SkillBadge";
import SectionTitle from "@/components/fx/SectionTitle";
import Timeline from "@/components/fx/Timeline";
import { experiences } from "@/data/experiences";
import type { Lang, Dict } from "@/types";

type Props = { lang: Lang; t: Dict };

export default function ExperienceSection({ lang, t }: Props) {
  return (
    <section id="experience" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:py-24">
      <SectionTitle index={2}>{t.experienceTitle}</SectionTitle>
      <Timeline
        entries={experiences.map((e) => ({
          title: lang === "fr" ? e.roleFR : e.roleEN,
          org: e.org,
          timeframe: e.timeframe,
          location: e.location,
          points: lang === "fr" ? e.pointsFR : e.pointsEN,
          footer: e.stack && e.stack.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {e.stack.map((s, idx) => <SkillBadge key={idx} item={s} />)}
            </div>
          ),
        }))}
      />
    </section>
  );
}
