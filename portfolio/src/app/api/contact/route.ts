// app/api/contact/route.ts
import { NextResponse } from "next/server";

// Optionnel : impose clairement le runtime Node (par défaut sur Vercel)
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { name, email, title, message, botField } = await req.json();

    // Honeypot anti-bot : si rempli, on fait "succès" silencieux
    if (botField) return NextResponse.json({ ok: true }, { status: 200 });

    // Validations simples
    const clean = (s: unknown) => String(s ?? "").trim();
    const _name = clean(name);
    const _email = clean(email);
    const _title = clean(title);
    const _message = clean(message);

    if (_name.length < 2) {
      return NextResponse.json({ ok: false, error: "Nom invalide" }, { status: 400 });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_email);
    if (!emailOk) {
      return NextResponse.json({ ok: false, error: "Email invalide" }, { status: 400 });
    }
    if (_message.length < 10) {
      return NextResponse.json({ ok: false, error: "Message trop court" }, { status: 400 });
    }
    if (_message.length > 2000) {
      return NextResponse.json({ ok: false, error: "Message trop long" }, { status: 413 });
    }

    // Variables d'env (serveur uniquement, sans NEXT_PUBLIC_)
    const SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
    const TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
    const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;   // recommandé côté serveur
    const PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;     // fallback si pas de private

    if (!SERVICE_ID || !TEMPLATE_ID || (!PRIVATE_KEY && !PUBLIC_KEY)) {
      console.error("Env missing", {
        hasService: !!SERVICE_ID,
        hasTemplate: !!TEMPLATE_ID,
        hasPrivate: !!PRIVATE_KEY,
        hasPublic: !!PUBLIC_KEY,
      });
      return NextResponse.json({ ok: false, error: "Configuration serveur incomplète" }, { status: 500 });
    }

    const now = new Date().toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
      hour12: false,
    });

    // Payload EmailJS
    const payload = {
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY ?? "", // requis si pas d'Authorization
      template_params: {
        name: _name,
        email: _email,
        title: _title,
        message: _message,
        site: "nizard.dev",
        time: now,
        reply_to: _email,
      },
    };

    // Préfère l'Authorization Bearer avec la clé privée
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (PRIVATE_KEY) headers.Authorization = `Bearer ${PRIVATE_KEY}`;

    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("❌ EmailJS error:", res.status, text);
      // 502 = upstream error
      return NextResponse.json({ ok: false, error: "EmailJS has failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    console.error("Contact route error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
