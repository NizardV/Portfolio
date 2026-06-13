"use client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import SkillBadge from "@/components/SkillBadge";
import { experiences } from "@/data/experiences";
import type { Lang, Dict } from "@/types";

type Props = { lang: Lang; t: Dict };

export default function ExperienceSection({ lang, t }: Props) {
  return (
    <section id="experience" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.experienceTitle}</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {experiences.map((e, i) => (
          <Card key={i} className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-md shadow-lg hover:bg-white/[0.12] transition-colors">
            <CardHeader>
              <CardTitle className="text-xl">{lang === "fr" ? e.roleFR : e.roleEN}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{e.org}</span>
                <Badge variant="secondary">{e.timeframe}</Badge>
              </CardDescription>
              {e.location && (
                <CardDescription className="flex items-center gap-2 mt-1 text-xs">
                  <MapPin className="w-3 h-3" />{e.location}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc pl-5 text-sm text-white/70 space-y-2">
                {(lang === "fr" ? e.pointsFR : e.pointsEN).map((pt, idx) => (
                  <li key={idx}>{pt}</li>
                ))}
              </ul>
              {e.stack && e.stack.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {e.stack.map((s, idx) => <SkillBadge key={idx} item={s} />)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
