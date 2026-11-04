"use client";
import { MapPin, Calendar } from "lucide-react";
import GlowCard from "@/components/fx/GlowCard";
import type { Lang, Dict } from "@/types";

type Props = { lang: Lang; t: Dict };

export default function AboutSection({ lang, t }: Props) {
  return (
    <GlowCard className="p-6">
      <h2 className="text-lg font-semibold">{lang === "fr" ? "À propos" : "About"}</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/75">{t.about}</p>
      <div className="mt-4 flex flex-col gap-2 text-xs text-white/70">
        <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Dijon, France</span>
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {lang === "fr" ? "Disponible dès sept. 2026" : "Available from Sept 2026"}
        </span>
      </div>
    </GlowCard>
  );
}
