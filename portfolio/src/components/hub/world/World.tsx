"use client";
import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Ambience } from "./audio";
import { hasWebGL, loadJSON, saveJSON, useReducedMotion, useTouch } from "./env";
import { QualityContext, isSoftwareRenderer, canFullscreen, fullscreenMode, pixelRatio, toggleFullscreen, useSettings } from "./settings";
import Fallback from "./Fallback";
import { createControls, useKeyboard } from "./input";
import GameMenu from "./GameMenu";
import Player from "./Player";
import DreamFilter from "./DreamFilter";
import { WorldStateContext } from "./state";
import { SCENES } from "./scenes";
import TouchControls from "./TouchControls";
import { START_ZONE, ZONE_ORDER, ZONES, type Interactable, type Portal, type Spawn, type ZoneId } from "./zones";

const WAKE_MS = 1800; // first fade from white: waking up
const FADE_MS = 500; // between zones
const STORE_PLACES = "hub-v2-places";
/** A pointer-locked mouse sometimes reports a bogus huge jump (Chrome on Windows): the view would snap. */
const MAX_MOUSE_STEP = 200;

const TOP_BUTTON = "rounded-full border border-white/25 bg-black/30 px-4 py-2 text-xs tracking-widest text-white/80 hover:text-white";

type Arrival = { zone: ZoneId; spawn: Spawn; n: number };
type Veil = { color: string; opaque: boolean; ms: number };

/** Fires once the zone's lazy scene has rendered: then the veil can lift. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

function useDiscovered(zone: ZoneId) {
  const [places, setPlaces] = useState<ReadonlySet<ZoneId>>(
    () => new Set(loadJSON<string[]>(STORE_PLACES, []).filter((id): id is ZoneId => id in ZONES)),
  );
  useEffect(() => {
    setPlaces((prev) => {
      if (prev.has(zone)) return prev;
      const next = new Set(prev).add(zone);
      saveJSON(STORE_PLACES, ZONE_ORDER.filter((id) => next.has(id)));
      return next;
    });
  }, [zone]);
  return places;
}

export default function World() {
  const [webgl] = useState(hasWebGL);
  const controls = useRef(createControls()).current;
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<Ambience | null>(null);
  const travelling = useRef(true); // the wake-up counts as a transition
  const lastUnlock = useRef(0);

  const [arrival, setArrival] = useState<Arrival>({ zone: START_ZONE, spawn: ZONES[START_ZONE].spawn, n: 0 });
  const [veil, setVeil] = useState<Veil>({ color: "#ffffff", opaque: true, ms: WAKE_MS });
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const resumeRef = useRef(() => {});
  const [settings, updateSettings] = useSettings();
  const [fullscreen, setFullscreen] = useState<ReturnType<typeof fullscreenMode>>(null);
  const [fsAvailable] = useState(canFullscreen);
  const [hint, setHint] = useState(true);
  const [waking, setWaking] = useState(true);
  const touch = useTouch();
  const reducedMotion = useReducedMotion();
  const discovered = useDiscovered(arrival.zone);
  const [weak, setWeak] = useState(false);
  const quality = useMemo(() => ({ quality: settings.quality, touch, weak }), [settings.quality, touch, weak]);
  const headBob = settings.headBob ?? !reducedMotion; // an explicit choice wins over the system setting
  const zone = ZONES[arrival.zone];
  const [used, setUsed] = useState<ReadonlySet<string>>(() => new Set());
  const worldState = useMemo(() => ({ used }), [used]);
  const [focus, setFocus] = useState<Interactable | null>(null);
  const [locked, setLocked] = useState(false);
  const [chromeAwake, setChromeAwake] = useState(true);
  const floorRef = useRef(zone.floor);
  floorRef.current = zone.floor;
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const filterOn = settings.filter && settings.quality !== "low" && !(weak && settings.quality === "auto");

  useKeyboard(controls, !menu);

  /* ---------- using things (doors…): E, click while looking around, or the on-screen button ---------- */
  const markUsed = useCallback((ids: readonly string[]) => {
    setUsed((prev) => (ids.every((id) => prev.has(id)) ? prev : new Set([...prev, ...ids])));
  }, []);
  const interact = useCallback(() => {
    const target = focusRef.current;
    if (!target) return;
    markUsed([target.id]);
    setFocus(null);
    audio.current?.sfx("door-open");
  }, [markUsed]);
  const interactRef = useRef(interact);
  interactRef.current = interact;
  const onStep = useCallback((run: boolean) => audio.current?.step(floorRef.current, run), []);

  /* ---------- the MENU button only shows when useful: mouse free on desktop, a few seconds after a tap on phones ---------- */
  useEffect(() => {
    if (!touch) return;
    let timer = setTimeout(() => setChromeAwake(false), 6000);
    const wake = () => {
      setChromeAwake(true);
      clearTimeout(timer);
      timer = setTimeout(() => setChromeAwake(false), 4000);
    };
    window.addEventListener("pointerdown", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", wake);
    };
  }, [touch]);
  const chromeVisible = menu || (touch ? chromeAwake : !locked);

  /* ---------- sound: starts on the first gesture (browser rule), one ambience per zone ---------- */
  useEffect(() => {
    const amb = new Ambience();
    audio.current = amb;
    const unlock = () => amb.start();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      amb.dispose();
      audio.current = null;
    };
  }, []);
  useEffect(() => audio.current?.play(zone.ambience), [zone.ambience]);
  useEffect(() => audio.current?.setLevel(settings.volume, settings.muted), [settings.volume, settings.muted]);
  useEffect(() => {
    // the page's own fullscreen fires fullscreenchange; the browser's (F11) only shows up as a resize
    const sync = () => setFullscreen(fullscreenMode());
    const onF11 = (e: KeyboardEvent) => {
      if (e.key !== "F11" || fullscreenMode() === "browser") return; // already in F11 mode: let the browser leave it
      e.preventDefault(); // where the browser allows it, F11 drives the page's fullscreen, so the menu stays in sync
      toggleFullscreen();
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("keydown", onF11);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("keydown", onF11);
    };
  }, []);

  /* ---------- travel: veil → swap zone → (lazy load) → Ready → lift veil ---------- */
  const travel = useCallback((to: ZoneId, spawn: Spawn, color: string) => {
    if (travelling.current) return;
    travelling.current = true;
    setVeil({ color, opaque: true, ms: FADE_MS });
    setTimeout(() => setArrival((a) => ({ zone: to, spawn, n: a.n + 1 })), FADE_MS);
  }, []);
  const onPortal = useCallback(
    (p: Portal) => {
      if (p.opens) markUsed(p.opens);
      travel(p.to, p.arrive ?? ZONES[p.to].spawn, p.veil);
    },
    [travel, markUsed],
  );
  const onReady = useCallback(() => {
    travelling.current = false;
    setVeil((v) => ({ ...v, opaque: false }));
    setTimeout(() => setWaking(false), 400); // eyes adjusting: the blur clears after the first fade
  }, []);
  const onMove = useCallback(() => setHint(false), []);

  /* ---------- mouse look (pointer lock) and the Escape menu ---------- */
  const lock = useCallback(() => {
    if (touch) return;
    // No « unadjustedMovement »: on Windows, Chrome could leave the cursor trapped in the window after unlocking.
    // Bogus mouse jumps are filtered in onMouse instead.
    try {
      (canvas.current?.requestPointerLock() as Promise<void> | undefined)?.catch?.(() => {}); // refused (too soon after Escape…): a click retries
    } catch {
      /* unsupported */
    }
  }, [touch]);

  useEffect(() => {
    const onLockChange = () => {
      setLocked(!!document.pointerLockElement);
      if (document.pointerLockElement) return;
      lastUnlock.current = performance.now();
      setMenu(true); // leaving mouse look (Escape) opens the menu
    };
    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas.current) return;
      if (Math.abs(e.movementX) > MAX_MOUSE_STEP || Math.abs(e.movementY) > MAX_MOUSE_STEP) return;
      controls.look.dx += e.movementX;
      controls.look.dy += e.movementY;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && !menuRef.current) {
        interactRef.current(); // same physical key on AZERTY and QWERTY
        return;
      }
      if (e.key === "Tab" && !e.shiftKey) {
        // Tab toggles the menu (Escape is partly swallowed by the browser while the mouse is captured).
        // Shift+Tab still moves between the menu's buttons for keyboard users.
        e.preventDefault();
        if (menuRef.current) resumeRef.current();
        else if (document.pointerLockElement) document.exitPointerLock(); // the unlock opens the menu
        else setMenu(true);
        return;
      }
      // Escape while locked already opened the menu through the unlock: don't toggle it shut again
      if (e.key !== "Escape" || performance.now() - lastUnlock.current < 400) return;
      setMenu((open) => !open);
    };
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("mousemove", onMouse);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("mousemove", onMouse);
      window.removeEventListener("keydown", onKey);
    };
  }, [controls]);

  const openMenu = () => {
    if (document.pointerLockElement) document.exitPointerLock(); // the unlock opens the menu
    else setMenu(true);
  };
  const resume = () => {
    setMenu(false);
    lock();
  };
  resumeRef.current = resume;
  const travelTo = (id: ZoneId) => {
    setMenu(false);
    travel(id, ZONES[id].spawn, "#000000");
  };

  if (!webgl) return <Fallback />;

  const Scene = SCENES[arrival.zone];
  return (
    <div className="absolute inset-0">
      <Canvas
        ref={canvas}
        style={{
          filter: waking && !reducedMotion ? "blur(10px)" : "none",
          transition: reducedMotion ? undefined : "filter 2.6s ease-out",
        }}
        camera={{ fov: 70, near: 0.05, far: 600 }}
        dpr={pixelRatio(weak && settings.quality === "auto" ? "low" : settings.quality, touch)}
        onCreated={({ gl }) => setWeak(isSoftwareRenderer(gl.getContext()))}
        onClick={() => {
          if (menu) return;
          if (document.pointerLockElement && focusRef.current) interact();
          else lock();
        }}
        aria-label={`Rêve à la première personne : ${zone.name}`}
      >
        <QualityContext.Provider value={quality}>
        <WorldStateContext.Provider value={worldState}>
        <Suspense fallback={null}>
          {/* Fragment, not group: the scene's <color>/<fog> must attach to the three.js scene itself */}
          <Fragment key={arrival.n}>
            <Scene />
            <Ready onReady={onReady} />
          </Fragment>
        </Suspense>
        </WorldStateContext.Provider>
        </QualityContext.Provider>
        {filterOn && <DreamFilter light={touch} />}
        <Player
          key={arrival.n}
          zone={zone}
          spawn={arrival.spawn}
          controls={controls}
          paused={menu}
          touch={touch}
          sensitivity={settings.sensitivity}
          invertY={settings.invertY}
          bob={headBob}
          used={used}
          onStep={onStep}
          onFocus={setFocus}
          onMove={onMove}
          onPortal={onPortal}
        />
      </Canvas>

      {touch && !menu && <TouchControls controls={controls} />}

      {hint && !menu && (
        <p className="pointer-events-none absolute bottom-8 w-full px-4 text-center text-xs tracking-widest text-white/70 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
          {touch ? "JOYSTICK À GAUCHE · GLISSE À DROITE POUR REGARDER" : "CLIQUE POUR REGARDER · ZQSD / WASD POUR MARCHER"}
        </p>
      )}

      {focus && !menu && (
        <div className="absolute bottom-24 z-10 flex w-full justify-center px-4">
          {touch ? (
            <button type="button" onClick={interact} className="rounded-full border border-white/40 bg-black/40 px-5 py-3 text-xs tracking-widest text-white">
              {focus.verb.toUpperCase()}
            </button>
          ) : (
            <p className="pointer-events-none rounded-full bg-black/35 px-4 py-2 text-xs tracking-widest text-white/90">
              <kbd className="mr-2 rounded border border-white/40 px-1.5">E</kbd>
              {focus.verb}
            </p>
          )}
        </div>
      )}

      <div
        className={`absolute right-4 top-4 z-10 flex gap-2 transition-opacity duration-500 ${chromeVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {touch && fsAvailable && fullscreen === null && (
          <button type="button" onClick={toggleFullscreen} className={TOP_BUTTON}>
            PLEIN ÉCRAN
          </button>
        )}
        <button type="button" onClick={openMenu} className={TOP_BUTTON}>
          MENU
        </button>
      </div>

      {/* the veil hides loading between zones; always mounted, toggled in CSS (no exit animation to get stuck) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 transition-opacity ease-in-out"
        style={{ background: veil.color, opacity: veil.opaque ? 1 : 0, transitionDuration: `${veil.ms}ms` }}
      />

      {menu && (
        <GameMenu
          current={arrival.zone}
          discovered={discovered}
          settings={settings}
          headBob={headBob}
          touch={touch}
          fullscreen={{ available: fsAvailable, mode: fullscreen, toggle: toggleFullscreen }}
          onSettings={updateSettings}
          onTravel={travelTo}
          onClose={resume}
        />
      )}
    </div>
  );
}
