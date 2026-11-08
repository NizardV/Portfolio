"use client";
import Link from "next/link";
import { ZONE_ORDER, ZONES, type ZoneId } from "./zones";

type Props = {
  current: ZoneId;
  discovered: ReadonlySet<ZoneId>;
  muted: boolean;
  touch: boolean;
  onTravel: (id: ZoneId) => void;
  onToggleSound: () => void;
  onClose: () => void;
};

const BUTTON = "rounded-full border border-white/20 px-4 py-2 text-xs tracking-widest text-white/80 hover:text-white";

/** Pause menu: jump to any place already found (handy for a hurried visitor, accessibility and weak devices). */
export default function PlacesMenu({ current, discovered, muted, touch, onTravel, onToggleSound, onClose }: Props) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
      <button type="button" aria-label="Reprendre" className="absolute inset-0 cursor-default bg-black/70" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Lieux découverts" className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-[#121212] p-6">
        <h2 className="text-sm font-semibold tracking-[0.3em] text-white/90">LIEUX DÉCOUVERTS</h2>
        <ul className="mt-4 space-y-2">
          {ZONE_ORDER.map((id) =>
            discovered.has(id) ? (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onTravel(id)}
                  className="w-full rounded-xl border border-white/10 px-4 py-3 text-left hover:border-white/30"
                  aria-current={id === current ? "location" : undefined}
                >
                  <span className="block text-sm text-white">
                    {ZONES[id].name}
                    {id === current && <span className="ml-2 text-xs text-white/50">· ici</span>}
                  </span>
                  <span className="mt-1 block text-xs text-white/50">{ZONES[id].description}</span>
                </button>
              </li>
            ) : (
              <li key={id} className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-white/30">
                ???
              </li>
            ),
          )}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-white/40">
          {touch
            ? "Joystick à gauche pour marcher, glisse à droite pour regarder."
            : "Clique pour regarder autour · ZQSD / WASD ou flèches pour marcher · Maj pour courir · Échap : ce menu."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={onClose} className={BUTTON}>
            REPRENDRE
          </button>
          <button type="button" onClick={onToggleSound} className={BUTTON} aria-pressed={!muted}>
            SON : {muted ? "COUPÉ" : "ACTIVÉ"}
          </button>
          <Link href="/" className={BUTTON}>
            SE RÉVEILLER
          </Link>
        </div>
      </div>
    </div>
  );
}
