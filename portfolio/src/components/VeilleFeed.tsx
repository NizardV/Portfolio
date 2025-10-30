"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ScrollablePanel from "@/components/ScrollablePanel";

export type VeilleItem = {
  id: string;
  title: string;
  url: string | null;
  category: string | null;
  date: string | null;     // ISO
  resume: string | null;
};

type Lang = "fr" | "en";

/* ---------- Dictionnaire ---------- */
const DICT = {
  fr: {
    title: "Veille Informationnelle",
    none: "Aucun résultat.",
    filters: { compact: "Compact", date: "Date", category: "Catégorie" },
    cats_all: "Toutes",
    date_all: "Toutes",
    date_options: {
      "24h": "Dernières 24h",
      "7d": "7 derniers jours",
      "30d": "30 derniers jours",
      week: "Cette semaine",
      month: "Ce mois-ci",
    },
    dateFmt: "fr-FR" as const,
  },
  en: {
    title: "Information Watch",
    none: "No results found.",
    filters: { compact: "Compact view", date: "Date", category: "Category" },
    cats_all: "All",
    date_all: "All",
    date_options: {
      "24h": "Last 24h",
      "7d": "Last 7 days",
      "30d": "Last 30 days",
      week: "This week",
      month: "This month",
    },
    dateFmt: "en-US" as const,
  },
} satisfies Record<Lang, any>;

/* ---------- Helpers UI ---------- */
const catColor = (cat?: string) => {
  const k = (cat ?? "").toLowerCase();
  if (k.includes("cyber")) return "from-cyan-400/60 to-blue-400/60";
  if (k.includes("tech")) return "from-violet-400/60 to-fuchsia-400/60";
  if (k.includes("jurid") || k.includes("eco")) return "from-amber-400/60 to-orange-400/60";
  return "from-slate-400/60 to-zinc-400/60";
};
const domainFromUrl = (url?: string | null) => { try { return url ? new URL(url).hostname.replace(/^www\./, "") : null; } catch { return null; } };
const Favicon = ({ url }: { url: string | null }) => {
  const host = domainFromUrl(url);
  if (!host) return null;
  return <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`} alt="" className="h-5 w-5 rounded-md opacity-90" />;
};
const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/75">{children}</span>
);

/* ---------- Date filter (valeurs internes stables) ---------- */
type DateKey = "all" | "24h" | "7d" | "30d" | "week" | "month";
function inRange(dateISO?: string | null, f: DateKey = "all") {
  if (!dateISO || f === "all") return true;
  const d = new Date(dateISO); if (isNaN(d.getTime())) return false;
  const now = new Date();
  const MS = (n: number) => n * 24 * 60 * 60 * 1000;
  if (f === "24h") return now.getTime() - d.getTime() <= MS(1);
  if (f === "7d")  return now.getTime() - d.getTime() <= MS(7);
  if (f === "30d") return now.getTime() - d.getTime() <= MS(30);
  if (f === "week") {
    const day = now.getDay() || 7; // Lundi=1 … Dimanche=7
    const monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate() - (day - 1));
    return d >= monday;
  }
  if (f === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return d >= first;
  }
  return true;
}

/* ---------- Carte ---------- */
const Card = ({ item, index, compact, locale }: { item: VeilleItem; index: number; compact: boolean; locale: string }) => {
  const firstCat = (item.category ?? "").split(",").map(t => t.trim()).filter(Boolean)[0];
  const clamp = compact ? 2 : 3;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.12) }}
      className={`group relative rounded-xl border border-white/10 bg-white/5 shadow-sm ring-1 ring-black/0 transition hover:border-white/20 hover:bg-white/[0.08] ${compact ? "p-3" : "p-4"}`}
    >
      <span aria-hidden className={`absolute left-0 top-0 h-full w-[3px] rounded-l-xl bg-gradient-to-b ${catColor(firstCat)}`} />
      <div className="flex items-start gap-3">
        <Favicon url={item.url} />
        <div className="min-w-0 flex-1">
          <h3 className={`${compact ? "text-[14px]" : "text-[15px] md:text-[16px]"} font-semibold leading-snug`}>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-[5px] transition group-hover:decoration-white/40" title={item.title}>
                {item.title}
              </a>
            ) : item.title}
          </h3>
          <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60 ${compact ? "gap-y-1" : ""}`}>
            {firstCat && <Badge>#{firstCat}</Badge>}
            <span>{item.date ? new Date(item.date).toLocaleDateString(locale, { dateStyle: "medium" }) : "—"}</span>
            {item.url && <span className="truncate">{domainFromUrl(item.url)}</span>}
          </div>
          {item.resume && (
            <p className={`${compact ? "mt-1" : "mt-2"} text-sm text-white/80`}
               style={{ display: "-webkit-box", WebkitLineClamp: clamp, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {item.resume}
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
};

/* ---------- Composant principal ---------- */
export default function VeilleFeed({ lang = "fr", heightClass }: { lang?: Lang; heightClass?: string }) {
  const L = DICT[lang];
  const [items, setItems] = useState<VeilleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [compact, setCompact] = useState(false);

  // filtres
  const [cat, setCat] = useState<string>(L.cats_all);
  const [dateKey, setDateKey] = useState<DateKey>("all");

  useEffect(() => {
    fetch("/api/veille")
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  // catégories (déduites)
  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const it of items)
      (it.category ?? "").split(",").map(t => t.trim()).filter(Boolean).forEach(t => s.add(t));
    return [L.cats_all, ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [items, L.cats_all]);

  // filtrage
  const filtered = useMemo(() => {
    const byCat = cat === L.cats_all
      ? items
      : items.filter(i => (i.category ?? "").split(",").map(t => t.trim()).includes(cat));
    return byCat.filter(i => inRange(i.date, dateKey));
  }, [items, cat, dateKey, L.cats_all]);

  // contrôles à droite (header)
  const rightControls = (
    <div className="flex items-center gap-2">
      {/* filtre date */}
      <select
        className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm"
        value={dateKey}
        onChange={e => setDateKey(e.target.value as DateKey)}
      >
        <option value="all">{L.date_all}</option>
        <option value="24h">{L.date_options["24h"]}</option>
        <option value="7d">{L.date_options["7d"]}</option>
        <option value="30d">{L.date_options["30d"]}</option>
        <option value="week">{L.date_options["week"]}</option>
        <option value="month">{L.date_options["month"]}</option>
      </select>

      {/* filtre catégorie */}
      <select
        className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm"
        value={cat}
        onChange={e => setCat(e.target.value)}
      >
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* compact */}
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-white/80">
        <input type="checkbox" className="accent-white/80" checked={compact} onChange={e => setCompact(e.target.checked)} />
        {L.filters.compact}
      </label>
    </div>
  );

  return (
    <ScrollablePanel title={L.title} right={rightControls} heightClass={heightClass ?? "h-[60vh] md:h-[64vh] xl:h-[66vh]"}>
      <div className={`grid grid-cols-1 ${compact ? "gap-2.5 md:gap-3" : "gap-3 md:gap-4"} lg:grid-cols-2`}>
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${compact ? "h-20" : "h-24"} animate-pulse rounded-xl border border-white/10 bg-white/5`} />
          ))}

        {!loading && filtered.map((it, i) => (
          <Card key={it.id} item={it} index={i} compact={compact} locale={L.dateFmt} />
        ))}

        {!loading && filtered.length === 0 && (
          <p className="col-span-full text-white/60">{L.none}</p>
        )}
      </div>
    </ScrollablePanel>
  );
}
