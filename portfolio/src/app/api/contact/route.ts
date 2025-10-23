import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { name, email, title, message } = await req.json();
    // Timestamp (format ISO 8601) simplified
    const now = new Date().toISOString().replace("T", " ").split(".")[0];

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY, // clé publique pour l’identification
        accessToken: process.env.EMAILJS_PRIVATE_KEY,         // clé privée pour authentification serveur
        template_params: {
          name,
          email,
          title: title || "",
          message,
          site: "nizard.dev",
          time: now,
          reply_to: email,
        },
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("❌ EmailJS error:", res.status, text);
      return NextResponse.json(
        { ok: false, error: text || "EmailJS API error" },
        { status: 500 }
      );
    }

    console.log("✅ Email sent successfully:", text);
    return NextResponse.json({ ok: true, result: text });
  } catch (e: any) {
    console.error("⚠️ Server error:", e);
    return NextResponse.json({ ok: false, error: e.message || "Server error" }, { status: 500 });
  }
}
