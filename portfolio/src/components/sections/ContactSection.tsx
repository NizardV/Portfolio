"use client";
import Contact from "@/components/Contact";
import type { Lang, Dict } from "@/types";

type Props = { lang: Lang; t: Dict };

export default function ContactSection({ lang, t }: Props) {
  return (
    <section id="contact" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.contactTitle}</h2>
      <p className="text-white/70 mb-6">{t.contactBlurb}</p>
      {/* Contact form — pointe vers /api/contact */}
      <Contact lang={lang} showTitle={false} />
    </section>
  );
}
