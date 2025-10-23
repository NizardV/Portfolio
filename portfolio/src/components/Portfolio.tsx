"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Download, Github, Linkedin, Mail, Globe2, Link as LinkIcon, MapPin, Calendar, ExternalLink } from "lucide-react";
import Contact from '@/components/Contact';
import {
  Server, Layout, Database, Wrench, FlaskConical, Workflow, Hammer, GraduationCap
} from "lucide-react";
import SkillBadge from "@/components/SkillBadge";
import Image from "next/image";
import Link from "next/link";


export default function Portfolio() {
  // ------- State --------

  // --- Fallback dictionary ---
  const FALLBACK_DICT = {
    fr: {
      nav: { about: "À propos", projects: "Projets", experience: "Expérience", skills: "Compétences", contact: "Contact" },
      heroTitle: "Nizard Verdenal",
      heroSub: "Développeur full-stack (Bachelor CPI - DIIAGE)",
      ctaCV: "Télécharger le CV",
      ctaContact: "Me contacter",
      about: "",
      projectsTitle: "Projets",
      experienceTitle: "Expérience",
      skillsTitle: "Compétences",
      contactTitle: "Contact",
      contactBlurb: "",
      form: { name: "Nom", email: "Email", message: "Message", send: "Envoyer" },
      footer: ""
    },
    en: {
      nav: { about: "About", projects: "Projects", experience: "Experience", skills: "Skills", contact: "Contact" },
      heroTitle: "Nizard Verdenal",
      heroSub: "Full-stack developer (Bachelor CPI - DIIAGE)",
      ctaCV: "Download CV",
      ctaContact: "Contact me",
      about: "",
      projectsTitle: "Projects",
      experienceTitle: "Experience",
      skillsTitle: "Skills",
      contactTitle: "Contact",
      contactBlurb: "",
      form: { name: "Name", email: "Email", message: "Message", send: "Send" },
      footer: ""
    }
  } as const;

  // --- Language state ---
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [dict, setDict] = useState<any>(FALLBACK_DICT); // loaded from /dict.json
  const t = dict[lang];

  // --- Experiences & Projects & Skills ---
  const [experiences, setExperiences] = useState<any[]>([]); // loaded from /experiences.json
  const [projects, setProjects] = useState<any[]>([]); // loaded from /projects.json
  const [skills, setSkills] = useState<any[]>([]); // loaded from /skills.json
  const groupIconMap: Record<string, any> = {
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
  const [showHeader, setShowHeader] = React.useState(true);
  const lastY = React.useRef(0);
  const onNavClick = () => setShowHeader(true);
  const HEADER_OFFSET = 80; // ~ h-16 + marge
  const scrollToId = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setShowHeader(true); // show header on nav click
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
    window.history.replaceState(null, "", `#${id}`);
  };

  // -------- Helpers --------

  // Get icon for skill group
  function getGroupIcon(key?: string) {
    if (!key) return Hammer;
    const normalized = key.toLowerCase();
    return groupIconMap[normalized] || Hammer;
  }

  // -------- Effects --------

  // Load dictionary (FR/EN) from /dict.json
  React.useEffect(() => {
    const url = "/dict.json"; // doit être dans /public/dict.json
    fetch(url, { cache: "no-store" })
      .then((r) => {
        console.log("dict status", r.status, r.url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        console.log("dict loaded:", data);
        setDict(data);
      })
      .catch((err) => {
        console.error("dict load error:", err);
        // on garde FALLBACK_DICT
        setDict(FALLBACK_DICT);
      });
  }, []);


  // Load experiences from /experiences.json
  React.useEffect(() => {
    fetch("/experiences.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => (Array.isArray(data) ? data : []))
      .then((list) => setExperiences(list))
      .catch(() => setExperiences([]));
  }, []);

  // Load projects from /projects.json
  React.useEffect(() => {
    fetch("/projects.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => (Array.isArray(data) ? data : []))
      .then((list) => setProjects(list))
      .catch(() => setProjects([]));
  }, []);

  // Load skills from /skills.json
  React.useEffect(() => {
    fetch("/skills.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => (Array.isArray(data) ? data : []))
      .then((list) => setSkills(list))
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
          if (delta > 4 && y > 80) setShowHeader(false);         // hide when scrolling down
          else if (delta < -4 || y < 120) setShowHeader(true);  // show when scrolling up
          lastY.current = y;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0b1020] text-white">
      {/* decorative background: subtle grid + gradient blobs */}
      <div className="pointer-events-none absolute inset-0 opacity-20
                      [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_48px),
                                  repeating-linear-gradient(0deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_48px)]"></div>
      <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl
                      bg-[radial-gradient(closest-side,rgba(0,179,255,0.35),transparent_70%)]"></div>
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl
                      bg-[radial-gradient(closest-side,rgba(168,85,247,0.25),transparent_70%)]"></div>

      <header
        className={`fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur transition-transform duration-300
                    ${showHeader ? "translate-y-0" : "-translate-y-full"}`}
      >
        {/* grille 3 colonnes: logo | nav | switch */}
        <div className="mx-auto max-w-6xl h-16 px-6 grid grid-cols-[auto_1fr_auto] items-center">

          {/* LOGO — cliquable uniquement sur sa zone */}
          <Link
            href="/"
            className="group flex items-center gap-3 shrink-0 justify-self-start"
            aria-label="Accueil Nizard.dev"
          >
            {/* Mobile: icône */}
            <div className="relative md:hidden h-8 w-8">
              <Image
                src="/brand/nv-icon.png"
                alt="NV"
                fill
                sizes="32px"
                priority
                className="object-contain transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_#06b6d4]"
              />
            </div>

            {/* Desktop: mot-symbole (taille + glow) */}
            <div className="relative hidden md:block h-16 w-[65px]">
              <Image
                src="/brand/nv-logo.png"
                alt="Nizard.dev"
                fill
                sizes="65px"
                priority
                className="object-contain transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_#06b6d4]"
              />
            </div>
          </Link>

          {/* NAV — centrée, sans overlay */}
          <nav className="hidden md:flex justify-self-center items-center justify-center gap-6 text-sm">
            <a href="#about"      onClick={(e) => scrollToId(e, "about")}      className="hover:underline">{t.nav.about}</a>
            <a href="#projects"   onClick={(e) => scrollToId(e, "projects")}   className="hover:underline">{t.nav.projects}</a>
            <a href="#experience" onClick={(e) => scrollToId(e, "experience")} className="hover:underline">{t.nav.experience}</a>
            <a href="#skills"     onClick={(e) => scrollToId(e, "skills")}     className="hover:underline">{t.nav.skills}</a>
            <a href="#contact"    onClick={(e) => scrollToId(e, "contact")}    className="hover:underline">{t.nav.contact}</a>
          </nav>

          {/* SWITCH — à droite */}
          <div className="justify-self-end flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span>FR</span>
              <Switch checked={lang === "en"} onCheckedChange={(v) => setLang(v ? "en" : "fr")} />
              <span>EN</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-16">

        {/* Hero */}
        <section id="about" className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        {/* banner */}
          <div className="mb-8 rounded-3xl ring-1 ring-white/10 overflow-hidden">
            <img
              src="/banner-linkedin.jpg"
              alt="Bannière"
              className="w-full h-56 md:h-64 lg:h-72 object-contain"
            />
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
                  <a href="/cv.pdf" download>
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
              <Card className="rounded-2xl border bg-white/5 border-white/10 shadow-lg">
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
                    <Calendar className="w-4 h-4" /> {lang === "fr" ? "Disponible dès sept. 2025" : "Available from Sep 2025"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Projects */}
        <section id="projects" className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.projectsTitle}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((p: any, i: number) => (
              <Card key={i} className="hover:shadow-xl transition-shadow rounded-2xl border bg-white/5 border-white/10 shadow-lg">
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
                      {p.stack.map((s: any, idx: number) => (
                        <SkillBadge key={idx} item={s} />
                      ))}
                    </div>
                  )}
                  <div className="pt-1">
                    {p.demo || p.repo || p.caseStudy ? (
                      <div className="flex gap-3">
                        {p.demo && (
                          <a
                            href={p.demo}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-sm hover:underline"
                          >
                            Demo <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                        {p.repo && (
                          <a
                            href={p.repo}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-sm hover:underline"
                          >
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
        <section id="experience" className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.experienceTitle}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {experiences.map((e, i) => (
              <Card key={i} className="rounded-2xl border bg-white/5 border-white/10 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {lang === "fr" ? e.roleFR : e.roleEN}
                  </CardTitle>
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

        {/* Skills */}
        <section id="skills" className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.skillsTitle}</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {skills.map((group: any, i: number) => (
              <Card key={i} className="rounded-2xl border bg-white/5 border-white/10 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {(() => {
                    const Icon = getGroupIcon(group.icon);
                    return <Icon className="w-4 h-4 opacity-80" />;
                  })()}
                  {lang === "fr"
                    ? group.labelFR || group.labelEN || group.label
                    : group.labelEN || group.labelFR || group.label}
                </CardTitle>
              </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {group.items.map((s: any, idx: number) => (
                    <SkillBadge key={idx} item={s} />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.contactTitle}</h2>
          <p className="text-white/70 mb-6">{t.contactBlurb}</p>
          <Contact />
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-12">
          <div className="max-w-6xl mx-auto px-4 py-8 text-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/70">{t.footer}</p>
            <div className="flex items-center gap-4">
              <a href="mailto:nizardverdenal.pro@gmail.com" className="inline-flex items-center hover:underline">
                <Mail className="w-4 h-4 mr-1" /> Email
              </a>
              <a
                href="https://github.com/NizardV"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center hover:underline"
              >
                <Github className="w-4 h-4 mr-1" /> GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/nizard-verdenal"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center hover:underline"
              >
                <Linkedin className="w-4 h-4 mr-1" /> LinkedIn
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
