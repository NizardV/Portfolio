"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, Github, Linkedin, Mail } from "lucide-react";
import Image from "next/image";
import AboutSection from "./AboutSection";
import type { Lang, Dict } from "@/types";

type Props = {
  lang: Lang;
  t: Dict;
  scrollToId: <T extends HTMLElement>(e: React.MouseEvent<T>, id: string) => void;
};

export default function HeroSection({ lang, t, scrollToId }: Props) {
  return (
    <section id="about" className="max-w-6xl mx-auto px-4 py-16 md:py-24">
      <div className="mb-10">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl ring-1 ring-white/10">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(1200px_300px_at_80%_-50%,rgba(0,179,255,0.18),transparent)]" />
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
              <a href={t.cvPath} download={t.cvFilename}>
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
          <AboutSection lang={lang} t={t} />
        </div>
      </div>
    </section>
  );
}
