"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Menu, X, Github, Linkedin, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import LangToggle from "@/components/LangToggle";
import HeroSection from "@/components/sections/HeroSection";
import ProjectsSection from "@/components/sections/ProjectsSection";
import ExperienceSection from "@/components/sections/ExperienceSection";
import EducationSection from "@/components/sections/EducationSection";
import SkillsSection from "@/components/sections/SkillsSection";
import ContactSection from "@/components/sections/ContactSection";
import { FALLBACK_DICT } from "@/lib/dict";
import type { Lang, AllDict, Project } from "@/types";

const SECTION_IDS = ["about", "projects", "experience", "education", "skills", "contact"] as const;
type SectionId = (typeof SECTION_IDS)[number];

function isAllDict(x: unknown): x is AllDict {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  return "fr" in obj && "en" in obj;
}

export default function Portfolio() {
  const [lang, setLang] = useState<Lang>("fr");
  const [dict, setDict] = useState<AllDict>(FALLBACK_DICT);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<SectionId>("about");
  const [showHeader, setShowHeader] = useState(true);
  const lastY = React.useRef(0);
  const t = dict[lang];

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

  useEffect(() => {
    fetch("/dict.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => { if (isAllDict(data)) setDict(data); else setDict(FALLBACK_DICT); })
      .catch(() => setDict(FALLBACK_DICT));
  }, []);

  useEffect(() => {
    fetch("/projects.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => (Array.isArray(data) ? (data as Project[]) : []))
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    const sections = SECTION_IDS.flatMap((id) => { const el = document.getElementById(id); return el ? [el] : []; });
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id as SectionId);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.2, 0.6] },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen relative overflow-hidden bg-[#0b1020] text-white bg-[radial-gradient(circle_at_top_right,rgba(0,179,255,0.05),transparent_60%)]">
      <div className="pointer-events-none absolute inset-0 opacity-10 [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_48px),repeating-linear-gradient(0deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_48px)]" />
      <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl bg-[radial-gradient(closest-side,rgba(0,179,255,0.35),transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl bg-[radial-gradient(closest-side,rgba(168,85,247,0.25),transparent_70%)]" />

      <header className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${showHeader ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="h-14 mt-2 mb-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,32,0.85),rgba(10,16,32,0.65))] backdrop-blur-xl shadow-[0_6px_20px_rgba(0,0,0,0.35)] flex items-center justify-between px-4">
            <Link href="/" className="group flex items-center gap-3 shrink-0" aria-label="Accueil">
              <div className="relative h-8 w-8 md:h-9 md:w-9">
                <Image src="/brand/nv-icon.png" alt="NV" fill priority sizes="(min-width: 768px) 36px, 32px" className="object-contain transition-transform group-hover:scale-110" />
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm relative">
              {SECTION_IDS.map((id) => {
                const isActive = activeId === id;
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={(e) => scrollToId<HTMLButtonElement>(e, id)}
                    className={`relative px-3 py-2 rounded-lg transition hover:bg-white/5 focus:outline-none ${isActive ? "text-white" : "text-white/80"}`}
                  >
                    {t.nav[id]}
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

            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <LangToggle lang={lang} onChange={setLang} />
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen((v) => !v)}
                className="md:hidden p-2 rounded-md hover:bg-white/10 focus:outline-none text-white"
                aria-label="Ouvrir le menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="md:hidden relative mx-3 mt-2 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1020]/70 via-[#12192f]/60 to-[#1c1230]/50 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.5)] flex flex-col text-center py-4 space-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,179,255,0.25),transparent_70%)] opacity-40 pointer-events-none" />
              {SECTION_IDS.map((id) => (
                <a key={id} href={`#${id}`} onClick={(e) => scrollToId(e, id)} className="relative block py-3 text-base font-medium text-white/90 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-lg mx-4">
                  {t.nav[id]}
                </a>
              ))}
              <div className="mx-10 border-t border-white/10 my-2" />
              <div className="flex justify-center pt-1">
                <LangToggle lang={lang} onChange={setLang} />
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-16">
        <HeroSection lang={lang} t={t} scrollToId={scrollToId} />
        <ProjectsSection lang={lang} t={t} projects={projects} />
        <ExperienceSection lang={lang} t={t} />
        <EducationSection lang={lang} t={t} />
        <SkillsSection lang={lang} t={t} />
        <ContactSection lang={lang} t={t} />

        <footer className="border-t border-white/10 mt-12">
          <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/brand/nv-logo-footer.png" alt="nizard.dev" width={300} height={90} sizes="(max-width: 640px) 180px, 240px" className="object-contain h-6 sm:h-7 md:h-8 w-auto shrink-0" priority />
              <p className="text-white/70 text-sm hidden sm:block">{t.footer}</p>
            </div>
            <nav className="flex flex-wrap items-center justify-center sm:justify-end gap-4 text-sm">
              <a href="mailto:nizardverdenal.pro@gmail.com" className="inline-flex items-center hover:underline">
                <Mail className="w-4 h-4 mr-1" /> Email
              </a>
              <a href="https://github.com/NizardV" target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:underline">
                <Github className="w-4 h-4 mr-1" /> GitHub
              </a>
              <a href="https://www.linkedin.com/in/nizard-verdenal" target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:underline">
                <Linkedin className="w-4 h-4 mr-1" /> LinkedIn
              </a>
            </nav>
          </div>
        </footer>
      </main>
    </div>
    </MotionConfig>
  );
}
