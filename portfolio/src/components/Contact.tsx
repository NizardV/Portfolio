"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-context"; // context-based toast

export default function Contact() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const { toast } = useToast(); // context-based toast
  const [loading, setLoading] = useState(false);

  const validate = (data: Record<string, FormDataEntryValue>) => {
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const message = String(data.message || "").trim();

    if (name.length < 2) return "Le nom doit faire au moins 2 caractères.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Adresse email invalide.";
    if (message.length < 10) return "Le message doit faire au moins 10 caractères.";
    return null;
  };

  const sendEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    const fd = new FormData(formRef.current);
    const payload = Object.fromEntries(fd.entries());

    // Anti-bot (honeypot)
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
        throw new Error(j?.error || "Échec de l’envoi");
      }

      toast({ message: "✅ Message envoyé avec succès !", variant: "success" });
      formRef.current.reset();
    } catch (err: any) {
      toast({
        message: `❌ Erreur lors de l’envoi : ${err?.message ?? "Veuillez réessayer."}`,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-gray-900 text-white">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">📬 Me Contacter</h2>

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
            placeholder="Votre nom"
            className="w-full p-3 rounded bg-gray-800 focus:ring-2 focus:ring-purple-500"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Votre email"
            className="w-full p-3 rounded bg-gray-800 focus:ring-2 focus:ring-purple-500"
            inputMode="email"
            required
          />
          <input
            type="text"
            name="title"
            placeholder="Sujet (optionnel)"
            className="w-full p-3 rounded bg-gray-800 focus:ring-2 focus:ring-purple-500"
          />
          <textarea
            name="message"
            placeholder="Votre message"
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
                Envoi…
              </>
            ) : (
              "Envoyer ✉️"
            )}
          </button>

          {/* Zone d’annonce accessible */}
          <p className="sr-only" aria-live="polite">
            {loading ? "Envoi en cours" : ""}
          </p>
        </form>
      </div>
    </section>
  );
}
