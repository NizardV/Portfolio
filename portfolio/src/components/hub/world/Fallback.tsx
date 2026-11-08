import Link from "next/link";
import { UNIVERSES } from "../universes";
import { ZONE_ORDER, ZONES } from "./zones";

/** Plain page for devices without WebGL: the places and projects, no 3D. */
export default function Fallback() {
  return (
    <div className="mx-auto max-w-md overflow-y-auto px-4 py-16 text-white">
      <h1 className="text-lg font-semibold tracking-[0.3em]">LE RÊVE NE CHARGE PAS</h1>
      <p className="mt-3 text-sm text-white/60">Ton appareil ne gère pas la 3D. Voici ce qu&apos;il y a de l&apos;autre côté.</p>
      <h2 className="mt-8 text-xs tracking-[0.3em] text-white/50">LIEUX</h2>
      <ul className="mt-3 space-y-3">
        {ZONE_ORDER.map((id) => (
          <li key={id}>
            <span className="block text-sm">{ZONES[id].name}</span>
            <span className="block text-xs text-white/50">{ZONES[id].description}</span>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-xs tracking-[0.3em] text-white/50">PROJETS</h2>
      <ul className="mt-3 space-y-3">
        {UNIVERSES.map((u) => (
          <li key={u.id}>
            <span className="block text-sm" style={{ color: u.color }}>{u.name}</span>
            <span className="block text-xs text-white/50">{u.tagline}</span>
          </li>
        ))}
      </ul>
      <Link href="/" className="mt-10 inline-block rounded-full border border-white/20 px-4 py-2 text-xs tracking-widest text-white/80">
        ← RETOUR AU PORTFOLIO
      </Link>
    </div>
  );
}
