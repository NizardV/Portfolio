"use client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { educations } from "@/data/educations";
import type { Lang, Dict } from "@/types";

type Props = { lang: Lang; t: Dict };

export default function EducationSection({ lang, t }: Props) {
  return (
    <section id="education" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.educationTitle}</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {educations.map((ed, i) => (
          <Card key={i} className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-md shadow-lg hover:bg-white/[0.12] transition-colors">
            <CardHeader>
              <CardTitle className="text-xl">
                {lang === "fr" ? ed.diplomaFR : ed.diplomaEN}
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{ed.school}</span>
                <Badge variant="secondary">{ed.timeframe}</Badge>
              </CardDescription>
              {ed.location && (
                <CardDescription className="flex items-center gap-2 mt-1 text-xs">
                  <MapPin className="w-3 h-3" />{ed.location}
                </CardDescription>
              )}
            </CardHeader>
            {(ed.detailsFR?.length || ed.detailsEN?.length) && (
              <CardContent>
                <ul className="list-disc pl-5 text-sm text-white/70 space-y-2">
                  {(lang === "fr" ? ed.detailsFR : ed.detailsEN)?.map((d, idx) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
