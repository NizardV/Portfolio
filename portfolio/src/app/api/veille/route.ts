// app/api/veille/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const NOTION_DB_ID = process.env.NOTION_DB_ID!;

// util
function toPlain(rt?: Array<{ plain_text?: string }>) {
  return (rt ?? []).map(r => r.plain_text ?? "").join("");
}

export async function GET() {
  try {
    if (!NOTION_TOKEN) throw new Error("NOTION_TOKEN manquant");
    if (!NOTION_DB_ID) throw new Error("NOTION_DB_ID manquant");

    const url = `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        // Version stable de l'API Notion
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        sorts: [{ property: "Date", direction: "descending" }],
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      // Remonte l’erreur Notion telle quelle pour debug (400, 401, 404, etc.)
      console.error("NOTION ERROR →", json);
      return NextResponse.json(
        { ok: false, error: json?.message ?? "Notion error", details: json },
        { status: res.status }
      );
    }

    const items = (json.results ?? []).map((page: any) => {
      const p = page.properties ?? {};
      return {
        id: page.id,
        title: p.Article?.title ? toPlain(p.Article.title) : "Sans titre",
        url: p.URL?.url ?? null,
        category: (p["Catégorie"]?.multi_select ?? [])
          .map((x: any) => x.name)
          .join(", ") || null,
        date: p.Date?.date?.start ?? null,
        resume: (p["Résumé"]?.rich_text ?? [])
          .map((r: any) => r.plain_text)
          .join("") || null,
      };
    });

    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("API VEILLE ERROR →", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
