"use client";
import GlowCard from "@/components/fx/GlowCard";
import Reveal from "@/components/fx/Reveal";
import SectionTitle from "@/components/fx/SectionTitle";
import { Server, Layout, Database, Wrench, FlaskConical, Workflow, Hammer, GraduationCap } from "lucide-react";
import SkillBadge from "@/components/SkillBadge";
import { skills } from "@/data/skills";
import type { Lang, Dict, SectionIconType } from "@/types";

type Props = { lang: Lang; t: Dict };

const GROUP_ICONS: Record<string, SectionIconType> = {
  backend: Server,
  frontend: Layout,
  data: Database,
  devops: Wrench,
  tests: FlaskConical,
  methods: Workflow,
  tools: Hammer,
  learning: GraduationCap,
};

function getGroupIcon(key?: string): SectionIconType {
  if (!key) return Hammer;
  return GROUP_ICONS[key.toLowerCase()] ?? Hammer;
}

export default function SkillsSection({ lang, t }: Props) {
  return (
    <section id="skills" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:py-24">
      <SectionTitle index={4}>{t.skillsTitle}</SectionTitle>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        {skills.map((group, i) => {
          const Icon = getGroupIcon(group.icon);
          const label = lang === "fr"
            ? group.labelFR ?? group.labelEN ?? group.label
            : group.labelEN ?? group.labelFR ?? group.label;
          return (
            <Reveal key={i} delay={(i % 3) * 0.06}>
              <GlowCard className="h-full p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Icon className="h-4 w-4 text-cyan-300/80" />
                  {label}
                </h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.items.map((s, idx) => <SkillBadge key={idx} item={s} />)}
                </div>
              </GlowCard>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
