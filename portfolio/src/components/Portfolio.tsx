"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Download, Github, Linkedin, Mail, Link as LinkIcon, MapPin, Calendar, ExternalLink, Menu, X } from "lucide-react";
import Contact from "@/components/Contact";
import { Server, Layout, Database, Wrench, FlaskConical, Workflow, Hammer, GraduationCap } from "lucide-react";
import SkillBadge from "@/components/SkillBadge";
import Image from "next/image";
import Link from "next/link";

// -------- Types --------

// Supported languages
type Lang = "fr" | "en";

// Dictionary structure
type Dict = {
  nav: { about: string; projects: string; experience: string; education: string; skills: string; contact: string };
  heroTitle: string;
  heroSub: string;
  ctaCV: string;
  ctaContact: string;
  about: string;
  projectsTitle: string;
  experienceTitle: string;
  educationTitle: string;
  skillsTitle: string;
  contactTitle: string;
  contactBlurb: string;
  form: { name: string; email: string; message: string; send: string };
  footer: string;
  cvPath: string;
  cvFilename: string;
};

// Complete dictionary for all languages
type AllDict = Readonly<Record<Lang, Dict>>;

// Experience structure
type Experience = {
  roleFR: string;
  roleEN: string;
  org: string;
  timeframe: string;
  pointsFR: string[];
  pointsEN: string[];
};

// Education structure
type Education = {
  diplomaFR: string;
  diplomaEN: string;
  school: string;
  timeframe: string;
  location?: string;
  detailsFR?: string[];
  detailsEN?: string[];
};

// Project structure
type Project = {
  title: string;
  timeframe?: string;
  location?: string;
  descriptionFR?: string;
  descriptionEN?: string;
  stack?: string[];
  demo?: string;
  repo?: string;
  caseStudy?: string;
  evidence?: "private_repo" | "not_hosted" | "coming_soon";
};

// Skill group structure
type SkillGroup = {
  label?: string;
  labelFR?: string;
  labelEN?: string;
  icon?: string;
  items: string[];
};

// Icon component type
type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

// -------- Fallback dictionary --------
export const FALLBACK_DICT: AllDict = {
  fr: {
    nav: { about: "À propos", projects: "Projets", experience: "Expérience", education: "Formation", skills: "Compétences", contact: "Contact" },
    heroTitle: "Nizard Verdenal",
    heroSub: "Développeur full-stack (Bachelor CPI - DIIAGE) • En recherche d'alternance à partir de novembre 2025",
    ctaCV: "Télécharger le CV",
    cvPath: "/brand/resume-nizard-public-updated-11-2025-fr.pdf",
    cvFilename: "CV_Nizard-Verdenal_FR.pdf",
    ctaContact: "Me contacter",
    about:
      "Étudiant en informatique (BTS SIO SLAM → Bachelor CPI) avec un fort intérêt pour les stacks web modernes (Laravel/.NET + React/Next) et la mise en place d'environnements fiables (Docker, CI/CD). J'aime concevoir des applis utiles et propres, documentées et faciles à maintenir.",
    projectsTitle: "Projets",
    experienceTitle: "Expérience",
    educationTitle: "Formation",
    skillsTitle: "Compétences",
    contactTitle: "Contact",
    contactBlurb: "Un projet, une opportunité d'alternance ou une question ? Écrivez-moi.",
    form: { name: "Nom", email: "Email", message: "Message", send: "Envoyer" },
    footer: "© 2025 - Nizard Verdenal. Tous droits réservés.",
  },
  en: {
    nav: { about: "About", projects: "Projects", experience: "Experience", education: "Education", skills: "Skills", contact: "Contact" },
    heroTitle: "Nizard Verdenal",
    heroSub: "Full-stack developer (Bachelor CPI - DIIAGE) • Seeking apprenticeship from November 2025",
    ctaCV: "Download Resume",
    cvPath: "/brand/resume-nizard-public-updated-11-2025-gb.pdf",
    cvFilename: "Resume_Nizard-Verdenal_EN.pdf",
    ctaContact: "Contact me",
    about:
      "Software student (BTS SIO SLAM → Bachelor CPI) focused on modern web stacks (Laravel/.NET + React/Next) and reliable environments (Docker, CI/CD). I build useful, clean apps with maintainable docs.",
    projectsTitle: "Projects",
    experienceTitle: "Experience",
    educationTitle: "Education",
    skillsTitle: "Skills",
    contactTitle: "Contact",
    contactBlurb: "Got a project, apprenticeship opportunity, or a question? Drop a line.",
    form: { name: "Name", email: "Email", message: "Message", send: "Send" },
    footer: "© 2025 - Nizard Verdenal. All rights reserved.",
  },
} as const;

export default function Portfolio() {
  // ------- State --------

  // Language states
  const [lang, setLang] = useState<Lang>("fr");
  const [dict, setDict] = useState<AllDict>(FALLBACK_DICT);
  const t = dict[lang];

  // Data states
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<SkillGroup[]>([]);

  // Menu states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("about");

  // Section IDs for nav and scroll
  const SECTION_IDS = ["about","projects","experience","education","skills","contact"] as const;

  // Map skill group keys to icons
  const groupIconMap: Record<string, IconType> = {
    backend: Server,
    frontend: Layout,
    data: Database,
    devops: Wrench,
    tests: FlaskConical,
    methods: Workflow,
    tools: Hammer,
    learning: GraduationCap,
  };

  // -------- Scroll: hide on down, show on up --------

  // Header show/hide on scroll
  const [showHeader, setShowHeader] = React.useState(true);
  const lastY = React.useRef(0);
  const HEADER_OFFSET = 100;
  const scrollToId = <T extends HTMLElement>(e: React.MouseEvent<T>, id: string) => {
    e.preventDefault();
    setShowHeader(true);
    setIsMenuOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
    window.history.replaceState(null, "", `#${id}`);
  };


  // -------- Resume links --------
  const cvHref = t.cvPath;
  const cvFilename = t.cvFilename;


  // -------- Helpers --------
  // Type guard for dictionary
  function isAllDict(x: unknown): x is AllDict {
    if (!x || typeof x !== "object") return false;
    const obj = x as Record<string, unknown>;
    return "fr" in obj && "en" in obj;
  }

  // Get icon for skill group
  function getGroupIcon(key?: string): IconType {
    if (!key) return Hammer;
    const normalized = key.toLowerCase();
    return groupIconMap[normalized] || Hammer;
  }

  // -------- Effects --------

  // Load dictionary
  React.useEffect(() => {
    fetch("/dict.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (isAllDict(data)) setDict(data);
        else setDict(FALLBACK_DICT);
      })
      .catch(() => setDict(FALLBACK_DICT));
  }, []);

  // Load experiences
  React.useEffect(() => {
    fetch("/experiences.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => (Array.isArray(data) ? (data as Experience[]) : []))
      .then(setExperiences)
      .catch(() => setExperiences([]));
  }, []);

  // Load educations
  React.useEffect(() => {
    fetch("/educations.json", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : []))
      .then((data: unknown) => (Array.isArray(data) ? (data as Education[]) : []))
      .then(setEducations)
      .catch(() => setEducations([]));
  }, []);


  // Load projects
  React.useEffect(() => {
    fetch("/projects.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => (Array.isArray(data) ? (data as Project[]) : []))
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  // Load skills
  React.useEffect(() => {
    fetch("/skills.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => (Array.isArray(data) ? (data as SkillGroup[]) : []))
      .then(setSkills)
      .catch(() => setSkills([]));
  }, []);

  // Scroll listener for header show/hide
  React.useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const delta = y - lastY.current;
          if (delta > 4 && y > 80) setShowHeader(false);
          else if (delta < -4 || y < 120) setShowHeader(true);
          lastY.current = y;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // IntersectionObserver to update active nav link
  React.useEffect(() => {
    const sections = SECTION_IDS
      .map(id => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    const obs = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top));
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.2, 0.6] }
    );
    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  // -------- Render --------

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0b1020] text-white bg-[radial-gradient(circle_at_top_right,rgba(0,179,255,0.05),transparent_60%)]">
      {/* decorative background */}
      <div className="pointer-events-none absolute inset-0 opacity-10 [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_48px),repeating-linear-gradient(0deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_48px)]"></div>
      <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl bg-[radial-gradient(closest-side,rgba(0,179,255,0.35),transparent_70%)]"></div>
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl bg-[radial-gradient(closest-side,rgba(168,85,247,0.25),transparent_70%)]"></div>

      {/* ====== HEADER ====== */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300
                    ${showHeader ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="mx-auto max-w-6xl px-6">
          {/* barre glass + gradient de bordure */}
          <div className="h-14 mt-2 mb-2 rounded-2xl border border-white/10
                          bg-[linear-gradient(180deg,rgba(10,16,32,0.85),rgba(10,16,32,0.65))]
                          backdrop-blur-xl shadow-[0_6px_20px_rgba(0,0,0,0.35)]
                          flex items-center justify-between px-4">
            {/* Logo (icône uniquement, toutes tailles) */}
            <Link href="/" className="group flex items-center gap-3 shrink-0" aria-label="Accueil">
              <div className="relative h-8 w-8 md:h-9 md:w-9">
                <Image
                  src="/brand/nv-icon.png"
                  alt="NV"
                  fill
                  priority
                  className="object-contain transition-transform group-hover:scale-110"
                />
              </div>
            </Link>


            {/* Nav desktop avec soulignement animé + lien actif */}
            <nav className="hidden md:flex items-center gap-1 text-sm relative">
              {SECTION_IDS.map((id) => {
                const isActive = activeId === id;
                return (
                  <button
                    key={id}
                    onClick={(e) => scrollToId<HTMLButtonElement>(e, id)}
                    className={`relative px-3 py-2 rounded-lg transition 
                                hover:bg-white/5 focus:outline-none ${isActive ? "text-white" : "text-white/80"}`}
                  >
                    {/* libellé */}
                    {t.nav[id]}
                    {/* underline animé */}
                    {isActive && (
                      <motion.span
                        layoutId="nv-underline"
                        className="absolute left-2 right-2 -bottom-[2px] h-[2px] bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Lang switch (desktop) + burger (mobile) */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-xs">
                <span>FR</span>
                <Switch checked={lang === "en"} onCheckedChange={(v) => setLang(v ? "en" : "fr")} />
                <span>EN</span>
              </div>
              {/* bouton burger mobile inchangé */}
              <button
                onClick={() => setIsMenuOpen((v) => !v)}
                className="md:hidden p-2 rounded-md hover:bg-white/10 focus:outline-none text-white"
                aria-label="Ouvrir le menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* MENU MOBILE — glassmorphism */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="md:hidden relative mx-3 mt-2 rounded-2xl border border-white/10 
                         bg-gradient-to-br from-[#0b1020]/70 via-[#12192f]/60 to-[#1c1230]/50
                         backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.5)]
                         flex flex-col text-center py-4 space-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,179,255,0.25),transparent_70%)] opacity-40 pointer-events-none" />
              {SECTION_IDS.map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => scrollToId(e, id)}
                  className="relative block py-3 text-base font-medium text-white/90 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-lg mx-4"
                >
                  {t.nav[id]}
                </a>
              ))}
              <div className="mx-10 border-t border-white/10 my-2" />
              <div className="flex justify-center items-center gap-2 pt-1 text-xs">
                <span>FR</span>
                <Switch checked={lang === "en"} onCheckedChange={(v) => setLang(v ? "en" : "fr")} />
                <span>EN</span>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* ====== MAIN ====== */}
      <main className="pt-16">
        {/* Hero */}
        <section id="about" className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          {/* banner */}
          <div className="mb-10">
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl ring-1 ring-white/10">
              {/* overlay conservé */}
              <div
                className="absolute inset-0 pointer-events-none
                          bg-[radial-gradient(1200px_300px_at_80%_-50%,rgba(0,179,255,0.18),transparent)]"
              />

              {/* Version mobile */}
              <Image
                src="/brand/nizardv-banner-mobile.png"
                alt="Bannière mobile"
                priority
                sizes="(max-width: 768px) 100vw, 0px"
                width={1280}
                height={400}
                className="block md:hidden w-full aspect-[21/6] object-cover"
                draggable={false}
              />

              {/* Version desktop */}
              <Image
                src="/brand/nizardv-banner.png"
                alt="Bannière"
                priority
                sizes="(max-width: 768px) 0px, 960px"
                width={1280}
                height={400}
                className="hidden md:block w-full aspect-[21/6] md:aspect-[21/5] object-cover"
                draggable={false}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-5 gap-8 items-center">
            <div className="md:col-span-3 space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-3xl md:text-5xl font-bold leading-tight"
              >
                {t.heroTitle}
              </motion.h1>
              <p className="text-white/80 text-base md:text-lg">{t.heroSub}</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <a href={cvHref} download={cvFilename}>
                    <Download className="w-4 h-4 mr-2" />
                    {t.ctaCV}
                  </a>
                </Button>
                <Button variant="secondary" asChild>
                  <a href="#contact" onClick={(e) => scrollToId(e, "contact")}>
                    <Mail className="w-4 h-4 mr-2" />
                    {t.ctaContact}
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://github.com/NizardV" target="_blank" rel="noreferrer">
                    <Github className="w-4 h-4 mr-2" /> GitHub
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://www.linkedin.com/in/nizard-verdenal" target="_blank" rel="noreferrer">
                    <Linkedin className="w-4 h-4 mr-2" /> LinkedIn
                  </a>
                </Button>
              </div>
            </div>
            <div className="md:col-span-2">
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
                    <Calendar className="w-4 h-4" /> {lang === "fr" ? "Disponible dès nov. 2025" : "Available from Nov 2025"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Projects */}
        <section id="projects" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.projectsTitle}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((p: Project, i: number) => (
              <Card key={i} className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-md shadow-lg hover:bg-white/[0.12] transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {p.title}
                        {p.timeframe && <Badge variant="secondary">{p.timeframe}</Badge>}
                      </CardTitle>
                      {p.location && (
                        <CardDescription className="flex items-center gap-2 mt-1 text-xs">
                          <MapPin className="w-3 h-3" /> {p.location}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(p.descriptionFR || p.descriptionEN) && (
                    <p className="text-sm text-white/70">
                      {lang === "fr" ? p.descriptionFR || p.descriptionEN : p.descriptionEN || p.descriptionFR}
                    </p>
                  )}
                  {Array.isArray(p.stack) && p.stack.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {p.stack.map((s: string, idx: number) => (
                        <SkillBadge key={idx} item={s} />
                      ))}
                    </div>
                  )}
                  <div className="pt-1">
                    {p.demo || p.repo || p.caseStudy ? (
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
                    ) : (
                      <div className="text-xs text-white/70 flex items-center gap-2">
                        <Badge variant="outline">
                          {p.evidence === "private_repo" && (lang === "fr" ? "Repo privé" : "Private repo")}
                          {p.evidence === "not_hosted" && (lang === "fr" ? "Non hébergé" : "Not hosted")}
                          {p.evidence === "coming_soon" && (lang === "fr" ? "Captures à venir" : "Screenshots soon")}
                          {!p.evidence && (lang === "fr" ? "Public" : "Public")}
                        </Badge>
                        <span>
                          {lang === "fr"
                            ? "Preuves disponibles sur demande (captures, vidéo, partage encadré)."
                            : "Evidence on request (screenshots, video, supervised share)."}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Experience */}
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
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 text-sm text-white/70 space-y-2">
                    {(lang === "fr" ? e.pointsFR : e.pointsEN).map((pt: string, idx: number) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Education / Formation */}
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
                    {ed.location && <span className="text-xs opacity-80">• {ed.location}</span>}
                  </CardDescription>
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


        {/* Skills */}
        <section id="skills" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.skillsTitle}</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {skills.map((group: SkillGroup, i: number) => (
              <Card key={i} className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-md shadow-lg hover:bg-white/[0.12] transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {(() => {
                      const Icon = getGroupIcon(group.icon);
                      return <Icon className="w-4 h-4 opacity-80" />;
                    })()}
                    {lang === "fr" ? group.labelFR || group.labelEN || group.label : group.labelEN || group.labelFR || group.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {group.items.map((s: string, idx: number) => (
                    <SkillBadge key={idx} item={s} />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.contactTitle}</h2>
          <p className="text-white/70 mb-6">{t.contactBlurb}</p>
          <Contact lang={lang} showTitle={false} />
        </section>

        {/* Footer */}
        <footer role="contentinfo" className="border-t border-white/10 mt-12">
          <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Logo complet horizontal */}
            <div className="flex items-center gap-3">
              <Image
                src="/brand/nv-logo-footer.png" // ← ton nouveau logo horizontal
                alt="nizard.dev"
                width={300}
                height={90}
                sizes="(max-width: 640px) 180px, 240px"
                className="object-contain h-6 sm:h-7 md:h-8 w-auto shrink-0"
                priority
              />
              <p className="text-white/70 text-sm hidden sm:block">{t.footer}</p>
            </div>

            {/* Liens */}
            <nav className="flex flex-wrap items-center justify-center sm:justify-end gap-4 text-sm">
              <a
                href="mailto:nizardverdenal.pro@gmail.com"
                className="inline-flex items-center hover:underline"
              >
                <Mail className="w-4 h-4 mr-1" /> Email
              </a>
              <a
                href="https://github.com/NizardV"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:underline"
              >
                <Github className="w-4 h-4 mr-1" /> GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/nizard-verdenal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:underline"
              >
                <Linkedin className="w-4 h-4 mr-1" /> LinkedIn
              </a>
            </nav>
          </div>
        </footer>

      </main>
    </div>
  );
}
