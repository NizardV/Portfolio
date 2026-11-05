"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, Github, Linkedin, Mail } from "lucide-react";
import HeroCanvas from "@/components/fx/HeroCanvas";
import AboutSection from "./AboutSection";
import type { Lang, Dict } from "@/types";

type Props = {
  lang: Lang;
  t: Dict;
  scrollToId: <T extends HTMLElement>(e: React.MouseEvent<T>, id: string) => void;
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }),
};

export default function HeroSection({ lang, t, scrollToId }: Props) {
  return (
    <section id="about" className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden">
      {/* faded with a mask (not a coloured overlay) so it blends into any page background, no seam */}
      <HeroCanvas />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-5">
        <div className="space-y-6 md:col-span-3">
          <motion.div custom={0} variants={item} initial="hidden" animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            {lang === "fr" ? "En alternance · CPAM de Côte-d'Or" : "Work-study · CPAM de Côte-d'Or"}
          </motion.div>

          <motion.h1 custom={1} variants={item} initial="hidden" animate="show"
            className="hero-name text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-7xl">
            {t.heroTitle}
          </motion.h1>

          <motion.p custom={2} variants={item} initial="hidden" animate="show" className="max-w-xl text-base text-white/80 md:text-lg">
            {t.heroSub}
          </motion.p>

          <motion.div custom={3} variants={item} initial="hidden" animate="show" className="flex flex-wrap gap-3">
            <Button asChild>
              <a href="#contact" onClick={(e) => scrollToId(e, "contact")}>
                <Mail className="mr-2 h-4 w-4" />
                {t.ctaContact}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://github.com/NizardV" target="_blank" rel="noreferrer">
                <Github className="mr-2 h-4 w-4" /> GitHub
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://www.linkedin.com/in/nizard-verdenal" target="_blank" rel="noreferrer">
                <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
              </a>
            </Button>
          </motion.div>
        </div>

        <motion.div custom={4} variants={item} initial="hidden" animate="show" className="md:col-span-2">
          <AboutSection lang={lang} t={t} />
        </motion.div>
      </div>

      <a
        href="#projects"
        onClick={(e) => scrollToId(e, "projects")}
        aria-label={lang === "fr" ? "Voir les projets" : "See projects"}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-bounce rounded-full p-2 text-white/50 transition hover:text-white md:block"
      >
        <ChevronDown className="h-6 w-6" />
      </a>
    </section>
  );
}
