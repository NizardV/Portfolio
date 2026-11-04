"use client";
import SectionTitle from "@/components/fx/SectionTitle";
import Timeline from "@/components/fx/Timeline";
import { educations } from "@/data/educations";
import type { Lang, Dict } from "@/types";

type Props = { lang: Lang; t: Dict };

export default function EducationSection({ lang, t }: Props) {
  return (
    <section id="education" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:py-24">
      <SectionTitle index={3}>{t.educationTitle}</SectionTitle>
      <Timeline
        entries={educations.map((ed) => ({
          title: lang === "fr" ? ed.diplomaFR : ed.diplomaEN,
          org: ed.school,
          timeframe: ed.timeframe,
          location: ed.location,
          points: lang === "fr" ? ed.detailsFR : ed.detailsEN,
        }))}
      />
    </section>
  );
}
