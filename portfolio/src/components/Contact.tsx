'use client';

import { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';

export default function Contact() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [status, setStatus] = useState("");

  const sendEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(formRef.current!);
    const payload = Object.fromEntries(formData.entries());

    // Honeypot anti-bot
    const honey = (formRef.current?.elements.namedItem('company') as HTMLInputElement | null)?.value;
    if (honey) return;

    setStatus('Envoi en cours...');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus("Message envoyé ✅");
      } else {
        setStatus("Erreur lors de l'envoi ❌");
      }
    } catch (err) {
      setStatus("Erreur réseau ❌");
    }
  };

  return (
    <section id="contact" className="py-20 bg-gray-900 text-white">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">📬 Me Contacter</h2>
        <form ref={formRef} onSubmit={sendEmail} className="space-y-4">
          <input name="name" placeholder="Votre nom" className="w-full p-3 rounded bg-gray-800" required />
          <input type="email" name="email" placeholder="Votre email" className="w-full p-3 rounded bg-gray-800" required />
          <input name="title" placeholder="Sujet" className="w-full p-3 rounded bg-gray-800" />
          <textarea name="message" placeholder="Votre message" className="w-full p-3 rounded bg-gray-800 h-32" required />
          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 transition font-semibold py-3 rounded">
            Envoyer ✉️
          </button>
        </form>
        {status && <p className="mt-4 text-sm text-gray-300">{status}</p>}
      </div>
    </section>
  );
}
