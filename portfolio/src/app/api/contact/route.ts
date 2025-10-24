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

    const brand = {
      primary: "#6366f1", // indigo
      bg: "#0b0f19",      // fond sombre doux
      card: "#121827",    // carte
      border: "#1f2a44",
      text: "#e5e7eb",
      mut: "#9aa4b2",
      chipBg: "#111827",
    };

    const nvLogo =
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0iIzYzNjZmMSIvPjxwYXRoIGQ9Ik0xMyAxNEgyMkwzNSA0MkgzMEwyMyAyOEwxNiA0MkgxMkwxMyAxNFoiIGZpbGw9IndoaXRlIi8+PC9zdmc+";

    const html = `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="color-scheme" content="dark light">
        <meta name="supported-color-schemes" content="dark light">
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:${brand.bg};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.bg};padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:90%;background:${brand.card};border:1px solid ${brand.border};border-radius:16px;overflow:hidden;">

                <!-- Header -->
                <tr>
                  <td align="center" style="padding:24px 0 12px 0;background:linear-gradient(135deg,rgba(99,102,241,0.18),rgba(56,189,248,0.12));border-bottom:1px solid ${brand.border}">
                    <img src="${nvLogo}" alt="NV Logo" width="44" height="44" style="display:block;margin-bottom:8px;border-radius:8px;" />
                    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:${brand.text};font-weight:700;font-size:20px;">
                      Nouveau message – Portfolio
                    </div>
                    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:${brand.mut};margin-top:4px;font-size:13px;">
                      Reçu le ${escapeHtml(now)}
                    </div>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:24px 28px;">
                    <!-- Infos expéditeur -->
                    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;margin-bottom:16px;">
                      <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${brand.chipBg};color:${brand.text};border:1px solid ${brand.border};font-size:12px;margin-right:8px;">
                        <strong style="color:${brand.mut};font-weight:600;">Nom:</strong> ${escapeHtml(_name)}
                      </span>
                      <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${brand.chipBg};color:${brand.text};border:1px solid ${brand.border};font-size:12px;">
                        <strong style="color:${brand.mut};font-weight:600;">Email:</strong> ${escapeHtml(_email)}
                      </span>
                    </div>

                    <!-- Sujet -->
                    <h2 style="margin:0 0 12px 0;font-family:Inter,Segoe UI,Arial,sans-serif;color:${brand.text};font-size:18px;">
                      ${escapeHtml(subject)}
                    </h2>

                    <!-- Message -->
                    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#0e1526;border:1px solid ${brand.border};border-radius:12px;padding:16px;color:${brand.text};line-height:1.6;">
                      ${escapeHtml(_message).replace(/\n/g, "<br>")}
                    </div>

                    <!-- Bouton Répondre -->
                    <div style="text-align:center;margin-top:24px;">
                      <a href="mailto:${escapeHtml(_email)}?subject=Re:%20${encodeURIComponent(subject)}" 
                        style="display:inline-block;background:${brand.primary};color:white;font-family:Inter,Segoe UI,Arial,sans-serif;
                        font-weight:600;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:999px;">
                        ✉️ Répondre à ${escapeHtml(_name)}
                      </a>
                    </div>

                    <!-- Footer -->
                    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:${brand.mut};font-size:13px;margin-top:24px;text-align:center;">
                      Envoyé depuis <a href="https://nizard.dev" style="color:${brand.primary};text-decoration:none;">nizard.dev</a><br>
                      © ${new Date().getFullYear()} Nizard Verdenal – Tous droits réservés
                    </div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    `;

    const text = `Nouveau message depuis le Portfolio
    Nom: ${_name}
    Email: ${_email}
    Titre: ${subject}

    ${_message}

    Envoyé le ${now} - nizard.dev`;


    // Appel REST Resend (pas besoin du SDK)
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [MAIL_TO],
        reply_to: [`${_name} <${_email}>`],
        subject,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<mailto:${MAIL_TO}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
        }
      })
    });

    const json = await r.json();
    if (!r.ok) {
      console.error("Resend error:", r.status, JSON.stringify(json, null, 2));
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
