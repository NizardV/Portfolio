import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { name, email, title, message } = await req.json();

    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,      // PUBLIC key ici
        accessToken: process.env.EMAILJS_PRIVATE_KEY, // PRIVATE key ici
        template_params: { name, email, title: title || "", message },
      }),
    });

    const text = await r.text();
    if (!r.ok) {
      console.error("EmailJS error:", r.status, text);
      return NextResponse.json({ ok: false, status: r.status, error: text }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: r.status, result: text });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
