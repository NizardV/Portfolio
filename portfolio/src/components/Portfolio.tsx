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

// ---- Quick notes ----
// • Single-file portfolio starter for React (Vite/Next).
// • Tailwind + shadcn/ui + framer-motion assumed.
// • Projects & Skills are loaded from /projects.json and /skills.json at runtime.
// • Bilingual FR/EN with a toggle, plus dark mode.

// --- Static experience data (editable in code) ---
const experiences = [
  {
    roleFR: "Alternant Développeur (recherche)",
    roleEN: "Apprenticeship - Full-Stack (seeking)",
    org: "DIIAGE / Entreprise (à définir)",
    timeframe: "Sept. 2025 → Sept. 2026",
    pointsFR: [
      "Périmètre full-stack: Laravel / ASP.NET Core, SQL Server & PostgreSQL, Docker",
      "CI/CD GitLab & GitHub, qualité (CodeQL), documentation",
      "Mise en place d'environnements dev/test/prod, SSL, monitoring",
    ],
    pointsEN: [
      "Full-stack scope: Laravel / ASP.NET Core, SQL Server & PostgreSQL, Docker",
      "CI/CD with GitLab & GitHub, quality (CodeQL), documentation",
      "Dev/test/prod environments, SSL, monitoring",
    ],
  },
  {
    roleFR: "Stagiaire Développeur (InnovQube)",
    roleEN: "Software Developer Intern (InnovQube)",
    org: "InnovQube",
    timeframe: "2024",
    pointsFR: [
      "Développement d'outils internes et petites features sur applications existantes",
      "Mises à jour correctives, revue de code, tickets JIRA / Git",
      "Bases de données relationnelles (modèles, migrations, requêtes)",
    ],
    pointsEN: [
      "Built internal tools and small features on existing apps",
      "Bugfixes, code review, ticket handling (JIRA / Git)",
      "Relational databases (models, migrations, queries)",
    ],
  },
  {
    roleFR: "Stagiaire Développeur (Association O.R.E.)",
    roleEN: "Software Developer Intern (Association O.R.E.)",
    org: "Association O.R.E.",
    timeframe: "2023",
    pointsFR: [
      "Site vitrine et modules back-office simples (contenus, médias)",
      "Intégration front (HTML/CSS/JS) et optimisation accessibilité de base",
      "Support utilisateur, petites corrections et déploiement",
    ],
    pointsEN: [
      "Showcase website and lightweight back-office modules (content, media)",
      "Front-end integration (HTML/CSS/JS) and basic accessibility improvements",
      "User support, small fixes and deployment",
    ],
  },
];

// --- Dictionary ---
const dict = {
  fr: {
    nav: { about: "À propos", projects: "Projets", experience: "Expérience", skills: "Compétences", contact: "Contact" },
    heroTitle: "Nizard Verdenal",
    heroSub: "Développeur full-stack (Bachelor CPI - DIIAGE) • En recherche d'alternance à partir de sept. 2025",
    ctaCV: "Télécharger le CV",
    ctaContact: "Me contacter",
    about: "Étudiant en informatique (BTS SIO SLAM → Bachelor CPI) avec un fort intérêt pour les stacks web modernes (Laravel/.NET + React/Next) et la mise en place d'environnements fiables (Docker, CI/CD). J'aime concevoir des applis utiles et propres, documentées et faciles à maintenir.",
    projectsTitle: "Projets",
    experienceTitle: "Expérience",
    skillsTitle: "Compétences",
    contactTitle: "Contact",
    contactBlurb: "Un projet, une opportunité d'alternance ou une question ? Écrivez-moi.",
    form: { name: "Nom", email: "Email", message: "Message", send: "Envoyer" },
    footer: "© " + new Date().getFullYear() + " - Nizard Verdenal. Tous droits réservés.",
  },
  en: {
    nav: { about: "About", projects: "Projects", experience: "Experience", skills: "Skills", contact: "Contact" },
    heroTitle: "Nizard Verdenal",
    heroSub: "Full-stack developer (Bachelor CPI - DIIAGE) • Seeking apprenticeship from Sep 2025",
    ctaCV: "Download CV",
    ctaContact: "Contact me",
    about: "Software student (BTS SIO SLAM → Bachelor CPI) focused on modern web stacks (Laravel/.NET + React/Next) and reliable environments (Docker, CI/CD). I build useful, clean apps with maintainable docs.",
    projectsTitle: "Projects",
    experienceTitle: "Experience",
    skillsTitle: "Skills",
    contactTitle: "Contact",
    contactBlurb: "Got a project, apprenticeship opportunity, or a question? Drop a line.",
    form: { name: "Name", email: "Email", message: "Message", send: "Send" },
    footer: "© " + new Date().getFullYear() + " - Nizard Verdenal. All rights reserved.",
  },
} as const;

export default function Portfolio() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [projects, setProjects] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const t = dict[lang];
  // -------- Scroll: hide on down, show on up --------
  const [showHeader, setShowHeader] = React.useState(true);
  const lastY = React.useRef(0);
  const onNavClick = () => setShowHeader(true);

  const HEADER_OFFSET = 80; // ~ h-16 + marge

  const scrollToId = (e: React.MouseEvent, id: string) => {
  e.preventDefault();
  setShowHeader(true); // on force l’apparition du header
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
  window.scrollTo({ top: y, behavior: "smooth" });
  // on met aussi le hash pour l’URL, après un petit délai
  window.history.replaceState(null, "", `#${id}`);
};

  // Hide header on scroll down
  React.useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const delta = y - lastY.current;
          if (delta > 4 && y > 80) setShowHeader(false);         // cache lorsqu'on descend
          else if (delta < -4 || y < 120) setShowHeader(true);  // montre lorsqu'on remonte
          lastY.current = y;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load projects from /projects.json (Option 1)
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

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert(
      lang === "fr"
        ? "Merci ! Votre message a été simulé côté client."
        : "Thanks! Your message was simulated on the client side."
    );
  };

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

      {/* Top Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 h-16 flex items-center backdrop-blur border-b transition-transform duration-300
                    ${showHeader ? "translate-y-0" : "-translate-y-full"}
                    bg-black/40 border-white/10`}
      >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <Globe2 className="w-5 h-5" /> <span>Nizard.dev</span>
        </div>
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <a href="#about"      onClick={(e) => scrollToId(e, "about")}      className="hover:underline">{t.nav.about}</a>
          <a href="#projects"   onClick={(e) => scrollToId(e, "projects")}   className="hover:underline">{t.nav.projects}</a>
          <a href="#experience" onClick={(e) => scrollToId(e, "experience")} className="hover:underline">{t.nav.experience}</a>
          <a href="#skills"     onClick={(e) => scrollToId(e, "skills")}     className="hover:underline">{t.nav.skills}</a>
          <a href="#contact"    onClick={(e) => scrollToId(e, "contact")}    className="hover:underline">{t.nav.contact}</a>
        </nav>
        <div className="flex items-center gap-3">
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
                  <a href="#contact">
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
                      {p.stack.map((s: string, idx: number) => (
                        <Badge key={idx} variant="outline">{s}</Badge>
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
                    {(lang === "fr" ? e.pointsFR : e.pointsEN).map((pt, idx) => (
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
                  <CardTitle className="text-lg">
                    {lang === "fr"
                      ? group.labelFR || group.labelEN || group.label
                      : group.labelEN || group.labelFR || group.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {Array.isArray(group.items) &&
                    group.items.map((s: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {s}
                      </Badge>
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
