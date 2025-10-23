"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-context";

// On ajoute une prop pour récupérer la langue du Portfolio
export default function Contact({ lang = "fr" }: { lang?: "fr" | "en" }) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // --- Dictionnaire bilingue ---
  const t = {
    fr: {
      title: "📬 Me Contacter",
      name: "Votre nom",
      email: "Votre email",
      subject: "Sujet (optionnel)",
      message: "Votre message",
      send: "Envoyer ✉️",
      sending: "Envoi…",
      validation: {
        name: "Le nom doit faire au moins 2 caractères.",
        email: "Adresse email invalide.",
        message: "Le message doit faire au moins 10 caractères.",
      },
      success: "✅ Message envoyé avec succès !",
      fail: "❌ Erreur lors de l’envoi : ",
      retry: "Veuillez réessayer.",
    },
    en: {
      title: "📬 Contact Me",
      name: "Your name",
      email: "Your email",
      subject: "Subject (optional)",
      message: "Your message",
      send: "Send ✉️",
      sending: "Sending…",
      validation: {
        name: "Name must be at least 2 characters long.",
        email: "Invalid email address.",
        message: "Message must be at least 10 characters long.",
      },
      success: "✅ Message sent successfully!",
      fail: "❌ Error while sending: ",
      retry: "Please try again.",
    },
  }[lang];

  const validate = (data: Record<string, FormDataEntryValue>) => {
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const message = String(data.message || "").trim();

    if (name.length < 2) return t.validation.name;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t.validation.email;
    if (message.length < 10) return t.validation.message;
    return null;
  };

  const sendEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    const fd = new FormData(formRef.current);
    const payload = Object.fromEntries(fd.entries());

    // Anti-bot
    if (payload.company) return;

    const error = validate(payload);
    if (error) {
      toast({ message: `❗ ${error}`, variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          title: payload.title,
          message: payload.message,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed");
      }

      toast({ message: t.success, variant: "success" });
      formRef.current.reset();
    } catch (err: any) {
      toast({
        message: `${t.fail}${err?.message ?? t.retry}`,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-gray-900 text-white">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">{t.title}</h2>

        <form ref={formRef} onSubmit={sendEmail} className="space-y-4" noValidate>
          {/* Honeypot caché */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <input
            type="text"
            name="name"
            placeholder={t.name}
            className="w-full p-3 rounded bg-gray-800 focus:ring-2 focus:ring-purple-500"
            required
          />
          <input
            type="email"
            name="email"
            placeholder={t.email}
            className="w-full p-3 rounded bg-gray-800 focus:ring-2 focus:ring-purple-500"
            inputMode="email"
            required
          />
          <input
            type="text"
            name="title"
            placeholder={t.subject}
            className="w-full p-3 rounded bg-gray-800 focus:ring-2 focus:ring-purple-500"
          />
          <textarea
            name="message"
            placeholder={t.message}
            className="w-full p-3 rounded bg-gray-800 h-32 focus:ring-2 focus:ring-purple-500"
            minLength={10}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 transition font-semibold py-3 rounded inline-flex items-center justify-center disabled:opacity-50"
            aria-busy={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.sending}
              </>
            ) : (
              t.send
            )}
          </button>

          {/* Zone d’annonce accessible */}
          <p className="sr-only" aria-live="polite">
            {loading ? t.sending : ""}
          </p>
        </form>
      </div>
    </section>
  );
}
