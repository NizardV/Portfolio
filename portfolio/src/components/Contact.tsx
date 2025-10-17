'use client';

import { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';

export default function Contact() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  const sendEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Honeypot anti-bot
    const honey = (formRef.current?.elements.namedItem('company') as HTMLInputElement | null)?.value;
    if (honey) return;

    setStatus('loading');
    setMsg('Envoi en cours...');

    try {
      await emailjs.sendForm(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE as string,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE as string,
        formRef.current!,
        process.env.NEXT_PUBLIC_EMAILJS_KEY as string
      );
      setStatus('ok');
      setMsg('Message envoyé ✅');
      formRef.current?.reset();
    } catch (error) {
      console.error(error);
      setStatus('err');
      setMsg("Erreur d’envoi ❌ Réessaie plus tard.");
    }
  };

  return (
    <section id="contact" className="py-12 md:py-16">
      <div className="max-w-3xl">
        <form ref={formRef} onSubmit={sendEmail} className="grid md:grid-cols-2 gap-4">
          {/* Honeypot (caché) */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <div>
            <label className="text-sm mb-2 block">Nom</label>
            <input
              name="name"
              placeholder="Votre nom complet"
              required
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3"
            />
          </div>

          <div>
            <label className="text-sm mb-2 block">Email</label>
            <input
              type="email"
              name="email"
              placeholder="votre.email@exemple.com"
              required
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm mb-2 block">Sujet (optionnel)</label>
            <input
              name="title"
              placeholder="Sujet"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm mb-2 block">Message</label>
            <textarea
              name="message"
              placeholder="Parlez-moi de votre besoin…"
              rows={6}
              required
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-xl px-5 py-3 font-semibold bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              {status === 'loading' ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>

          {msg && (
            <p
              className={`md:col-span-2 ${
                status === 'ok'
                  ? 'text-green-400'
                  : status === 'err'
                  ? 'text-red-400'
                  : 'text-neutral-400'
              }`}
            >
              {msg}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
