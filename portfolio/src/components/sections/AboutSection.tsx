"use client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, Calendar } from "lucide-react";
import type { Lang, Dict } from "@/types";

type Props = { lang: Lang; t: Dict };

export default function AboutSection({ lang, t }: Props) {
  return (
    <Card className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-md shadow-lg hover:bg-white/[0.12] transition-colors">
      <CardHeader>
        <CardTitle>{lang === "fr" ? "À propos" : "About"}</CardTitle>
        <CardDescription>{lang === "fr" ? "Résumé rapide" : "Quick summary"}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-white/70 space-y-3">
        <p>{t.about}</p>
        <div className="flex items-center gap-2 text-xs">
          <MapPin className="w-4 h-4" /> Dijon, France
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4" />
          {lang === "fr" ? "Disponible dès sept. 2026" : "Available from Sept 2026"}
        </div>
      </CardContent>
    </Card>
  );
}
