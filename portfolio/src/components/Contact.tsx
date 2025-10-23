"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, User2, Mail, Type as TypeIcon, MessageSquareText } from "lucide-react";
import { useToast } from "@/components/ui/toast-context";

type Lang = "fr" | "en";

export default function Contact({
  lang = "fr",
  showTitle = false,
}: {
  lang?: Lang;
  showTitle?: boolean;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Skeleton placeholder to avoid white flash on hydration
    return (
      <div className="relative max-w-2xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-xl animate-pulse h-72" />
      </div>
    );
  }

  const t = {
    fr: {
      title: "📬 Me Contacter",
      name: "Votre nom",
      email: "Votre email",
      subject: "Sujet (optionnel)",
      message: "Votre message",
      send: "Envoyer",
      sending: "Envoi…",
      validation: {
        name: "Le nom doit faire au moins 2 caractères.",
        email: "Adresse email invalide.",
        message: "Le message doit faire au moins 10 caractères.",
      },
      success: "✅ Message envoyé avec succès !",
      fail: "❌ Erreur lors de l'envoi : ",
      retry: "Veuillez réessayer.",
    },
    en: {
      title: "📬 Contact Me",
      name: "Your name",
      email: "Your email",
      subject: "Subject (optional)",
      message: "Your message",
      send: "Send",
      sending: "Sending…",
      validation: {
        name: "Name must be at least 2 characters.",
        email: "Invalid email address.",
        message: "Message must be at least 10 characters.",
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

    // Honeypot anti-bot
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
        const j = await res.text().catch(() => "");
        throw new Error(j || "EmailJS API error");
      }

      toast({ message: t.success, variant: "success" });
      formRef.current.reset();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.retry;
      toast({ message: `${t.fail}${msg}`, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* halo subtil pour rappeler tes blobs */}
      <div className="pointer-events-none absolute -inset-x-10 -top-10 h-40 rounded-full blur-3xl opacity-30
                      bg-[radial-gradient(closest-side,rgba(168,85,247,0.25),transparent_70%)]" />
      <div className="rounded-2xl border bg-white/5 border-white/10 shadow-xl backdrop-blur-md">
        {showTitle && (
          <div className="px-6 pt-6">
            <h2 className="text-2xl md:text-3xl font-bold">{t.title}</h2>
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={sendEmail}
          className="p-6 md:p-8 space-y-5"
          noValidate
        >
          {/* Honeypot */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          {/* Grid 2 colonnes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={<User2 className="w-4 h-4" />} >
              <input
                type="text"
                name="name"
                placeholder={t.name}
                className="w-full bg-transparent outline-none placeholder-white/50"
                required
              />
            </Field>

            <Field icon={<Mail className="w-4 h-4" />}>
              <input
                type="email"
                name="email"
                placeholder={t.email}
                className="w-full bg-transparent outline-none placeholder-white/50"
                inputMode="email"
                required
              />
            </Field>
          </div>

          <Field icon={<TypeIcon className="w-4 h-4" />}>
            <input
              type="text"
              name="title"
              placeholder={t.subject}
              className="w-full bg-transparent outline-none placeholder-white/50"
            />
          </Field>

          <Field icon={<MessageSquareText className="w-4 h-4" />} big>
            <textarea
              name="message"
              placeholder={t.message}
              className="w-full h-32 bg-transparent outline-none resize-y placeholder-white/50"
              minLength={10}
              required
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl font-semibold py-3
                       bg-gradient-to-r from-fuchsia-600 to-cyan-500
                       hover:from-fuchsia-500 hover:to-cyan-400
                       focus:outline-none focus:ring-2 focus:ring-white/40
                       disabled:opacity-60 transition"
            aria-busy={loading}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? t.sending : t.send}
            </span>
          </button>

          <p className="sr-only" aria-live="polite">
            {loading ? t.sending : ""}
          </p>
        </form>
      </div>
    </div>
  );
}

/* --- Wrapper for form fields --- */
function Field({
  children,
  icon,
  big = false,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  big?: boolean;
}) {
  return (
    <label
      className={`group flex items-start gap-3 rounded-xl border border-white/10 bg-white/5
                  focus-within:border-white/20 focus-within:ring-2 focus-within:ring-purple-500/40
                  transition px-3 ${big ? "py-3" : "py-2.5"}`}
    >
      <span className="mt-1.5 text-white/70 group-focus-within:text-white transition">
        {icon}
      </span>
      {children}
    </label>
  );
}
