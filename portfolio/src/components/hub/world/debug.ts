import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Box3, Raycaster, Vector3, type Camera, type Clock, type Scene, type WebGLRenderer } from "three";
import { loadJSON, saveJSON } from "./env";
import type { Zone } from "./zones";

/**
 * Building tools only: once `localStorage["hub-debug-spawn"]` is set (see World.firstArrival), the world exposes
 * `window.__hub` so scripts/hub-tour.mjs can move the camera, read the scene and audit what is placed in it.
 * Never set for visitors: nothing here runs in a normal visit.
 */
export type HubDebug = {
  zone: Zone;
  scene: Scene;
  camera: Camera;
  gl: WebGLRenderer;
  ground: (x: number, z: number) => number;
  /** puts the player there at once (no walking, no doorway fired) */
  teleport: (x: number, z: number, yaw: number, pitch?: number) => void;
  /** stops (true) or restarts the clock every animation reads, so two shots of one spot differ only by the camera */
  freeze: (on: boolean) => void;
  three: { Box3: typeof Box3; Raycaster: typeof Raycaster; Vector3: typeof Vector3 };
};

const debugOn = () => loadJSON<unknown>("hub-debug-spawn", null) !== null;

function freezer(clock: Clock) {
  return (on: boolean) => {
    clock.autoStart = !on;
    if (on) clock.stop();
    else clock.start();
  };
}

export function useHubDebug(zone: Zone, ground: HubDebug["ground"], teleport: HubDebug["teleport"]) {
  const { scene, camera, gl, clock } = useThree();
  useEffect(() => {
    if (!debugOn()) return;
    const w = window as unknown as { __hub?: HubDebug };
    const handle: HubDebug = { zone, scene, camera, gl, ground, teleport, freeze: freezer(clock), three: { Box3, Raycaster, Vector3 } };
    w.__hub = handle;
    return () => {
      if (w.__hub === handle) delete w.__hub;
    };
  }, [zone, scene, camera, gl, clock, ground, teleport]);
  useBugReport(zone, camera, gl);
}

/* ---------- bug report key (testers only) ---------- */

const REPORT_KEY = "hub-dev";
/** `/hub?dev=1` turns the key on for this browser, `?dev=0` turns it off. */
function reportOn() {
  try {
    const dev = new URLSearchParams(window.location.search).get("dev");
    if (dev !== null) saveJSON(REPORT_KEY, dev === "1");
  } catch {
    /* no URL: keep the stored choice */
  }
  return loadJSON(REPORT_KEY, false) || debugOn();
}

const round = (v: number, d = 2) => Number(v.toFixed(d));

/** the spot in the format scripts/hub-tour.mjs --at takes: "x,z,yaw°,pitch°" (yaw 0 = towards -z) */
function spotOf(camera: Camera) {
  const dir = camera.getWorldDirection(new Vector3());
  const yaw = (((Math.atan2(-dir.x, -dir.z) * 180) / Math.PI) % 360 + 360) % 360;
  const pitch = (Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180) / Math.PI;
  return `${round(camera.position.x)},${round(camera.position.z)},${Math.round(yaw)},${Math.round(pitch)}`;
}

function toast(text: string) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText =
    "position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:9999;max-width:calc(100vw - 32px);padding:8px 14px;" +
    "background:#000c;color:#fff;font:13px system-ui;border-radius:6px;pointer-events:none";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

/**
 * P (testers only, see reportOn): saves what the player sees (JPEG named after the zone and spot) and copies the spot,
 * so a bug is reported in one key press and replayed exactly with `hub-tour <zone> --at "<spot>"`. Every report is
 * also kept in localStorage["hub-reports"].
 */
function useBugReport(zone: Zone, camera: Camera, gl: WebGLRenderer) {
  useEffect(() => {
    if (!reportOn()) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyP" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const spot = spotOf(camera);
      // the next frame's callback runs after the world's own render in that frame: the canvas still holds the image
      requestAnimationFrame(() => {
        const a = document.createElement("a");
        a.href = gl.domElement.toDataURL("image/jpeg", 0.9);
        a.download = `hub-bug_${zone.id}_${spot.replaceAll(",", "_")}.jpg`;
        a.click();
      });
      const reports = loadJSON<{ zone: string; spot: string; at: string }[]>("hub-reports", []);
      saveJSON("hub-reports", [...reports, { zone: zone.id, spot, at: new Date().toISOString() }].slice(-200));
      navigator.clipboard?.writeText(`${zone.id} ${spot}`).catch(() => undefined);
      toast(`Bug signalé : ${zone.id} ${spot} (copié, capture enregistrée)`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zone, camera, gl]);
}
