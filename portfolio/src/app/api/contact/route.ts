// app/api/contact/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs"; // important sur Vercel

export async function POST(req: Request) {
  try {
    const { name, email, title, message, botField } = await req.json();
    if (botField) return NextResponse.json({ ok: true });

    const SERVICE_ID = process.env.EMAILJS_SERVICE_ID?.trim();
    const TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID?.trim();
    const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY?.trim();
    const PUBLIC_KEY  = process.env.EMAILJS_PUBLIC_KEY?.trim();

    // Logs sûrs (pas de secret)
    console.log("ENV CHECK:", {
      hasService: !!SERVICE_ID,
      hasTemplate: !!TEMPLATE_ID,
      hasPrivate: !!PRIVATE_KEY,
      privateLen: PRIVATE_KEY?.length ?? 0,
      hasPublic: !!PUBLIC_KEY,
    });

    if (!SERVICE_ID || !TEMPLATE_ID) {
      return NextResponse.json({ ok: false, error: "Config serveur incomplète" }, { status: 500 });
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (PRIVATE_KEY) headers.Authorization = `Bearer ${PRIVATE_KEY}`;

    const payload = {
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY ?? "",
      template_params: {
        name, email, title: title ?? "", message,
        site: "nizard.dev",
        time: new Date().toISOString(),
        reply_to: email,
      },
    };

    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const txt = await r.text();
    if (!r.ok) {
      console.error("EmailJS error:", r.status, txt);
      return NextResponse.json({ ok: false, error: "EmailJS a échoué" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Contact route error:", e?.message);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}
