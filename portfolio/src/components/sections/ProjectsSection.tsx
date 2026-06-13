"use client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink, Link as LinkIcon } from "lucide-react";
import SkillBadge from "@/components/SkillBadge";
import type { Lang, Dict, Project } from "@/types";

type Props = { lang: Lang; t: Dict; projects: Project[] };

function ProjectCard({ p, lang }: { p: Project; lang: Lang }) {
  const description = lang === "fr" ? p.descriptionFR ?? p.descriptionEN : p.descriptionEN ?? p.descriptionFR;
  const hasLinks = p.demo || p.repo || p.caseStudy;

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-md shadow-lg hover:bg-white/[0.12] transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {p.title}
          {p.timeframe && <Badge variant="secondary">{p.timeframe}</Badge>}
        </CardTitle>
        {p.location && (
          <CardDescription className="flex items-center gap-2 mt-1 text-xs">
            <MapPin className="w-3 h-3" /> {p.location}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {description && <p className="text-sm text-white/70">{description}</p>}
        {Array.isArray(p.stack) && p.stack.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {p.stack.map((s, idx) => <SkillBadge key={idx} item={s} />)}
          </div>
        )}
        <div className="pt-1">
          {hasLinks ? (
            <div className="flex gap-3">
              {p.demo && (
                <a href={p.demo} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm hover:underline">
                  Demo <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              )}
              {p.repo && (
                <a href={p.repo} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm hover:underline">
                  Repo <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              )}
              {p.caseStudy && (
                <a href={p.caseStudy} className="inline-flex items-center text-sm hover:underline">
                  Case Study <LinkIcon className="w-3 h-3 ml-1" />
                </a>
              )}
            </div>
          ) : p.evidence ? (
            <div className="text-xs text-white/70 flex items-center gap-2">
              <Badge variant="outline">
                {p.evidence === "private_repo" && (lang === "fr" ? "Repo privé" : "Private repo")}
                {p.evidence === "not_hosted" && (lang === "fr" ? "Non hébergé" : "Not hosted")}
                {p.evidence === "coming_soon" && (lang === "fr" ? "Captures à venir" : "Screenshots soon")}
              </Badge>
              <span>
                {lang === "fr"
                  ? "Preuves disponibles sur demande (captures, vidéo, partage encadré)."
                  : "Evidence on request (screenshots, video, supervised share)."}
              </span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectsSection({ lang, t, projects }: Props) {
  const schoolProjects = projects.filter((p) => !p.personal);
  const personalProjects = projects.filter((p) => p.personal);

  return (
    <section id="projects" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.projectsTitle}</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {schoolProjects.map((p, i) => <ProjectCard key={i} p={p} lang={lang} />)}
      </div>

      {personalProjects.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl md:text-2xl font-bold mb-6">
            {t.projectsPersonalTitle ?? (lang === "fr" ? "Projets personnels" : "Personal projects")}
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {personalProjects.map((p, i) => <ProjectCard key={i} p={p} lang={lang} />)}
          </div>
        </div>
      )}
    </section>
  );
}
