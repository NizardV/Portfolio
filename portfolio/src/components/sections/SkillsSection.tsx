"use client";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
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
    <section id="skills" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.skillsTitle}</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        {skills.map((group, i) => {
          const Icon = getGroupIcon(group.icon);
          const label = lang === "fr"
            ? group.labelFR ?? group.labelEN ?? group.label
            : group.labelEN ?? group.labelFR ?? group.label;
          return (
            <Card key={i} className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-md shadow-lg hover:bg-white/[0.12] transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Icon className="w-4 h-4 opacity-80" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {group.items.map((s, idx) => <SkillBadge key={idx} item={s} />)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
