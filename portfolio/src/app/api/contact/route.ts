// app/api/contact/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  try {
    const { name, email, title, message, botField } = await req.json();

    // Honeypot anti-bot
    if (botField) return NextResponse.json({ ok: true });

    const _name = String(name ?? "").trim();
    const _email = String(email ?? "").trim();
    const _title = String(title ?? "").trim();
    const _message = String(message ?? "").trim();

    if (_name.length < 2) {
      return NextResponse.json({ ok: false, error: "Nom invalide" }, { status: 400 });
    }
    if (!isEmail(_email)) {
      return NextResponse.json({ ok: false, error: "Email invalide" }, { status: 400 });
    }
    if (_message.length < 10) {
      return NextResponse.json({ ok: false, error: "Message trop court" }, { status: 400 });
    }
    if (_message.length > 2000) {
      return NextResponse.json({ ok: false, error: "Message trop long" }, { status: 413 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
    const MAIL_TO = process.env.MAIL_TO?.trim();
    const MAIL_FROM = process.env.MAIL_FROM?.trim();

    if (!RESEND_API_KEY || !MAIL_TO || !MAIL_FROM) {
      console.error("Missing env:", { hasKey: !!RESEND_API_KEY, hasTo: !!MAIL_TO, hasFrom: !!MAIL_FROM });
      return NextResponse.json({ ok: false, error: "Configuration serveur incomplète" }, { status: 500 });
    }

    const subject = _title || `Nouveau message - Portfolio`;
    const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", hour12: false });

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;font-size:14px;color:#111">
        <h2 style="margin:0 0 12px;">📬 Nouveau message depuis le portfolio</h2>
        <p><b>Nom:</b> ${escapeHtml(_name)}</p>
        <p><b>Email:</b> ${escapeHtml(_email)}</p>
        <p><b>Titre:</b> ${escapeHtml(subject)}</p>
        <p><b>Message:</b></p>
        <pre style="white-space:pre-wrap;background:#f6f7f9;padding:12px;border-radius:8px">${escapeHtml(_message)}</pre>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
        <p style="color:#666">Envoyé le ${now} — nizard.dev</p>
      </div>
    `;

    // Appel REST Resend (pas besoin du SDK)
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: MAIL_FROM,       // ex: "Portfolio <onboarding@resend.dev>" (test) ou "Portfolio <contact@nizard.dev>"
        to: [MAIL_TO],         // destinataire(s)
        reply_to: [_email],    // pour répondre au visiteur
        subject,
        html
      })
    });

    const json = await r.json();
    if (!r.ok) {
      console.error("Resend error:", r.status, json);
      return NextResponse.json({ ok: false, error: "Envoi impossible" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Contact route error:", e?.message);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
