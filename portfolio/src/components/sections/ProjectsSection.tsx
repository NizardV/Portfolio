"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ExternalLink, Link as LinkIcon, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SkillBadge from "@/components/SkillBadge";
import GlowCard from "@/components/fx/GlowCard";
import Reveal from "@/components/fx/Reveal";
import SectionTitle from "@/components/fx/SectionTitle";
import { useSound } from "@/lib/sound";
import type { Lang, Dict, Project } from "@/types";

type Props = { lang: Lang; t: Dict; projects: Project[] };

const STACK_PREVIEW = 4;

const describe = (p: Project, lang: Lang) =>
  lang === "fr" ? p.descriptionFR ?? p.descriptionEN : p.descriptionEN ?? p.descriptionFR;

function ProjectLinks({ p, lang }: { p: Project; lang: Lang }) {
  const links = [
    { href: p.demo, label: "Demo", external: true },
    { href: p.repo, label: "Repo", external: true },
    { href: p.caseStudy, label: "Case Study", external: false },
  ].filter((l): l is { href: string; label: string; external: boolean } => Boolean(l.href));
  if (links.length > 0) {
    return (
      <div className="flex flex-wrap gap-3">
        {links.map((l) => (
          <a key={l.label} href={l.href} {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="inline-flex items-center rounded-lg bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20">
            {l.label}
            {l.external ? <ExternalLink className="ml-1.5 h-3.5 w-3.5" /> : <LinkIcon className="ml-1.5 h-3.5 w-3.5" />}
          </a>
        ))}
      </div>
    );
  }
  if (!p.evidence) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-white/70">
      <Badge variant="outline">
        {p.evidence === "private_repo" && (lang === "fr" ? "Repo privé" : "Private repo")}
        {p.evidence === "not_hosted" && (lang === "fr" ? "Non hébergé" : "Not hosted")}
        {p.evidence === "coming_soon" && (lang === "fr" ? "Captures à venir" : "Screenshots soon")}
      </Badge>
      <span>{lang === "fr" ? "Preuves disponibles sur demande." : "Evidence on request."}</span>
    </div>
  );
}

function ProjectCard({ p, lang, onOpen }: { p: Project; lang: Lang; onOpen: () => void }) {
  const stack = p.stack ?? [];
  const extra = stack.length - STACK_PREVIEW;
  return (
    <GlowCard tilt className="h-full">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full flex-col p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 rounded-2xl"
        aria-haspopup="dialog"
        data-sound="open"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{p.title}</h3>
          {p.timeframe && <Badge variant="secondary" className="shrink-0">{p.timeframe}</Badge>}
        </div>
        <p className="mt-3 line-clamp-3 text-sm text-white/70">{describe(p, lang)}</p>
        {stack.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stack.slice(0, STACK_PREVIEW).map((s, i) => <SkillBadge key={i} item={s} />)}
            {extra > 0 && <span className="self-center text-xs text-white/50">+{extra}</span>}
          </div>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm text-cyan-300/90">
          {lang === "fr" ? "Voir le détail" : "View details"} <ArrowUpRight className="h-4 w-4" />
        </span>
      </button>
    </GlowCard>
  );
}

function ProjectModal({ p, lang, onClose, onEscape }: { p: Project; lang: Lang; onClose: () => void; onEscape: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onEscape(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onEscape]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" data-sound="close" data-no-hover aria-label={lang === "fr" ? "Fermer" : "Close"} onClick={onClose} className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0f1528] p-6 shadow-[0_0_60px_rgba(0,179,255,0.15)] md:p-8"
      >
        <button ref={closeRef} type="button" data-sound="close" onClick={onClose} aria-label={lang === "fr" ? "Fermer" : "Close"}
          className="absolute right-4 top-4 rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-wrap items-center gap-3 pr-10">
          <h3 id="project-modal-title" className="text-2xl font-bold">{p.title}</h3>
          {p.timeframe && <Badge variant="secondary">{p.timeframe}</Badge>}
        </div>
        {p.location && (
          <p className="mt-2 flex items-center gap-2 text-xs text-white/60"><MapPin className="h-3.5 w-3.5" /> {p.location}</p>
        )}
        <p className="mt-5 leading-relaxed text-white/80">{describe(p, lang)}</p>
        {p.stack && p.stack.length > 0 && (
          <>
            <h4 className="mt-6 text-xs font-semibold uppercase tracking-widest text-white/50">Stack</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.stack.map((s, i) => <SkillBadge key={i} item={s} />)}
            </div>
          </>
        )}
        <div className="mt-7"><ProjectLinks p={p} lang={lang} /></div>
      </motion.div>
    </motion.div>
  );
}

export default function ProjectsSection({ lang, t, projects }: Props) {
  const [open, setOpen] = useState<Project | null>(null);
  const { play } = useSound();
  const schoolProjects = projects.filter((p) => !p.personal);
  const personalProjects = projects.filter((p) => p.personal);

  const openProject = (p: Project) => setOpen(p);
  const close = useCallback(() => setOpen(null), []);
  // Escape has no click, so it plays its own sound
  const closeWithKey = useCallback(() => { play("close"); setOpen(null); }, [play]);

  const grid = (list: Project[]) => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((p, i) => (
        <Reveal key={p.title} delay={(i % 3) * 0.08}>
          <ProjectCard p={p} lang={lang} onOpen={() => openProject(p)} />
        </Reveal>
      ))}
    </div>
  );

  return (
    <section id="projects" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:py-24">
      <SectionTitle index={1}>{t.projectsTitle}</SectionTitle>
      {grid(schoolProjects)}

      {personalProjects.length > 0 && (
        <div className="mt-14">
          <Reveal>
            <h3 className="mb-6 text-xl font-bold md:text-2xl">
              {t.projectsPersonalTitle ?? (lang === "fr" ? "Projets personnels" : "Personal projects")}
            </h3>
          </Reveal>
          {grid(personalProjects)}
        </div>
      )}

      <AnimatePresence>
        {open && <ProjectModal key={open.title} p={open} lang={lang} onClose={close} onEscape={closeWithKey} />}
      </AnimatePresence>
    </section>
  );
}
