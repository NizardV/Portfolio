"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { isIOS, isStandalone, type Quality, type Settings } from "./settings";
import { ZONE_ORDER, ZONES, type ZoneId } from "./zones";

type Props = {
  current: ZoneId;
  discovered: ReadonlySet<ZoneId>;
  settings: Settings;
  /** effective head bob (the setting, or the system default) */
  headBob: boolean;
  touch: boolean;
  fullscreen: { available: boolean; mode: "page" | "browser" | null; toggle: () => void };
  onSettings: (patch: Partial<Settings>) => void;
  onTravel: (id: ZoneId) => void;
  onClose: () => void;
};

const TABS = [
  { id: "places", label: "Lieux" },
  { id: "graphics", label: "Graphismes" },
  { id: "audio", label: "Audio" },
  { id: "controls", label: "Contrôles" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const BUTTON = "rounded-full border border-white/20 px-4 py-2 text-xs tracking-widest text-white/80 hover:text-white";
const CHOICE = "rounded-full border px-3 py-1.5 text-xs";
const QUALITIES: { id: Quality; label: string }[] = [
  { id: "low", label: "Basse" },
  { id: "auto", label: "Auto" },
  { id: "high", label: "Haute" },
];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <span className="text-sm text-white/80">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row label={label}>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`${CHOICE} ${checked ? "border-white/60 text-white" : "border-white/15 text-white/50"}`}>
        {checked ? "Oui" : "Non"}
      </button>
    </Row>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <Row label={label}>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-40 accent-white" />
    </Row>
  );
}

function Places({ current, discovered, onTravel }: Pick<Props, "current" | "discovered" | "onTravel">) {
  return (
    <ul className="space-y-2">
      {ZONE_ORDER.map((id) =>
        discovered.has(id) ? (
          <li key={id}>
            <button type="button" onClick={() => onTravel(id)} className="w-full rounded-xl border border-white/10 px-4 py-3 text-left hover:border-white/30" aria-current={id === current ? "location" : undefined}>
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
  );
}

/** Pause menu, by category: places found (direct travel), graphics, audio, controls. */
export default function GameMenu({ current, discovered, settings, headBob, touch, fullscreen, onSettings, onTravel, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("places");
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
      <button type="button" aria-label="Reprendre" className="absolute inset-0 cursor-default bg-black/70" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Menu" className="relative flex max-h-full w-full max-w-md flex-col rounded-2xl border border-white/15 bg-[#121212] p-5">
        <div role="tablist" aria-label="Catégories" className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="menu-panel" onClick={() => setTab(t.id)} className={`${CHOICE} ${tab === t.id ? "border-white/60 bg-white/10 text-white" : "border-white/10 text-white/50 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id="menu-panel" aria-labelledby={`tab-${tab}`} className="mt-4 min-h-40 overflow-y-auto">
          {tab === "places" && (
            <>
              <h2 className="mb-3 text-xs tracking-[0.3em] text-white/50">LIEUX DÉCOUVERTS</h2>
              <Places current={current} discovered={discovered} onTravel={onTravel} />
            </>
          )}
          {tab === "graphics" && (
            <>
              <Row label="Qualité">
                <div className="flex gap-1.5">
                  {QUALITIES.map((q) => (
                    <button key={q.id} type="button" aria-pressed={settings.quality === q.id} onClick={() => onSettings({ quality: q.id })} className={`${CHOICE} ${settings.quality === q.id ? "border-white/60 text-white" : "border-white/15 text-white/50"}`}>
                      {q.label}
                    </button>
                  ))}
                </div>
              </Row>
              <Toggle label="Filtre de rêve (grain, couleurs)" checked={settings.filter} onChange={(filter) => onSettings({ filter })} />
              <Toggle label="Balancement de la marche" checked={headBob} onChange={(headBob) => onSettings({ headBob })} />
              {fullscreen.available && fullscreen.mode !== "browser" && (
                <Toggle label="Plein écran" checked={fullscreen.mode === "page"} onChange={fullscreen.toggle} />
              )}
              {fullscreen.mode === "browser" && (
                <Row label="Plein écran">
                  <span className="text-xs text-white/50">Oui · F11 pour quitter</span>
                </Row>
              )}
              {!fullscreen.available && isIOS() && !isStandalone() && (
                <p className="mt-2 text-xs leading-relaxed text-white/50">
                  Plein écran sur iPhone : touche Partager, puis « Sur l&apos;écran d&apos;accueil ». Le rêve s&apos;ouvrira alors sans les barres du navigateur.
                </p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-white/40">La qualité règle pour l&apos;instant la résolution ; les ombres et effets suivront avec les vrais décors.</p>
            </>
          )}
          {tab === "audio" && (
            <>
              <Toggle label="Son" checked={!settings.muted} onChange={(on) => onSettings({ muted: !on })} />
              <Slider label="Volume" value={settings.volume} min={0} max={1} step={0.05} onChange={(volume) => onSettings({ volume })} />
            </>
          )}
          {tab === "controls" && (
            <>
              <Slider label="Sensibilité" value={settings.sensitivity} min={0.25} max={2.5} step={0.05} onChange={(sensitivity) => onSettings({ sensitivity })} />
              <Toggle label="Inverser l'axe vertical" checked={settings.invertY} onChange={(invertY) => onSettings({ invertY })} />
              <p className="mt-3 text-xs leading-relaxed text-white/50">
                {touch
                  ? "Joystick à gauche pour marcher (poussé à fond : courir), glisse à droite pour regarder."
                  : "Clique pour regarder autour · ZQSD / WASD ou flèches pour marcher · Maj pour courir · E ou clic : utiliser · Tab ou Échap : ouvrir / fermer le menu."}
              </p>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={onClose} className={BUTTON}>
            REPRENDRE
          </button>
          <Link href="/" className={BUTTON}>
            SE RÉVEILLER
          </Link>
        </div>
      </div>
    </div>
  );
}
