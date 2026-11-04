"use client";
import Contact from "@/components/Contact";
import Reveal from "@/components/fx/Reveal";
import SectionTitle from "@/components/fx/SectionTitle";
import type { Lang, Dict } from "@/types";

type Props = { lang: Lang; t: Dict };

export default function ContactSection({ lang, t }: Props) {
  return (
    <section id="contact" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:py-24">
      <SectionTitle index={4}>{t.contactTitle}</SectionTitle>
      <Reveal>
        <p className="mb-8 text-white/70">{t.contactBlurb}</p>
        {/* Contact form — posts to /api/contact */}
        <Contact lang={lang} showTitle={false} />
      </Reveal>
    </section>
  );
}
