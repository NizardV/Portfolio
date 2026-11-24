/**
 * All sound is synthesised with the Web Audio API: nothing to download. Recorded CC0 sounds can replace any
 * of these later; the public API (play / step / sfx) stays.
 * Browsers only allow sound after a user gesture: call start() from a click / key / touch handler.
 */
import { voice, type Emitter, type Voice } from "./sounds";

export type AmbienceId = "wind" | "hum" | "lobby" | "water" | "city" | "mall" | "nursery" | "garden" | "purple" | "quiet" | "none";
export type Surface = "grass" | "carpet" | "hard" | "tile";
export type Sfx = "door-open" | "door-locked" | "switch" | "pickup";

const MAX_VOLUME = 0.35; // « 100 % » stays a background level
const CROSSFADE = 1.5; // seconds
const NOISE_SECONDS = 9; // long enough that the loop is not heard

type Layer = { gain: GainNode; stop: () => void };
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function noiseBuffer(ctx: AudioContext, brown: boolean): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02; // soft, not hissy
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

/** Repeats `fn` at random intervals until stopped (gusts, birds…). */
function every(min: number, max: number, fn: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const next = () => {
    timer = setTimeout(() => {
      fn();
      next();
    }, rand(min, max) * 1000);
  };
  next();
  return () => clearTimeout(timer);
}

function loop(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.loopStart = 0;
  src.start(0, rand(0, NOISE_SECONDS)); // each layer starts somewhere else in the buffer
  return src;
}

/** Short bird call: a few quick pitch sweeps, panned somewhere around the player. */
function chirp(ctx: AudioContext, out: AudioNode) {
  const pan = ctx.createStereoPanner();
  pan.pan.value = rand(-0.9, 0.9);
  pan.connect(out);
  const base = rand(2200, 3800);
  let t = ctx.currentTime;
  const notes = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < notes; i++) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const len = rand(0.05, 0.12);
    osc.frequency.setValueAtTime(base * rand(0.9, 1.15), t);
    osc.frequency.exponentialRampToValueAtTime(base * rand(1.2, 1.6), t + len);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(rand(0.02, 0.05), t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(env).connect(pan);
    osc.start(t);
    osc.stop(t + len + 0.02);
    t += len + rand(0.03, 0.12);
  }
}

/** Close, rare, unsettling: knocks in a wall, a whisper, a tube crackling (the Lobby only). */
function uncanny(ctx: AudioContext, noise: AudioBuffer, out: AudioNode) {
  const t = ctx.currentTime;
  const pan = ctx.createStereoPanner();
  pan.pan.value = rand(-0.8, 0.8);
  pan.connect(out);
  const kind = Math.random();
  const burst = (at: number, len: number, type: BiquadFilterType, f: number, q: number, level: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = f;
    filter.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(level, at + Math.min(0.01, len / 4));
    env.gain.exponentialRampToValueAtTime(0.0001, at + len);
    src.connect(filter).connect(env).connect(pan);
    src.start(at, rand(0, NOISE_SECONDS - 1), len + 0.05);
    return filter;
  };
  if (kind < 0.4) {
    // three knocks behind a wall, a pause, sometimes one more
    const n = Math.random() < 0.3 ? 4 : 3;
    for (let k = 0; k < n; k++) {
      const at = t + k * rand(0.28, 0.34) + (k === 3 ? 0.9 : 0);
      burst(at, 0.09, "lowpass", rand(140, 220), 1, 0.35);
      burst(at, 0.03, "bandpass", 900, 2, 0.05);
    }
  } else if (kind < 0.7) {
    // a whisper: breath through a moving vowel filter, too short to understand
    const len = rand(1.2, 2.2);
    const f = burst(t, len, "bandpass", 1200, 6, 0.05);
    f.frequency.setValueAtTime(rand(800, 1100), t);
    f.frequency.linearRampToValueAtTime(rand(1800, 2400), t + len * 0.4);
    f.frequency.linearRampToValueAtTime(rand(900, 1300), t + len);
  } else {
    // a tube on its way out, just above: a few crackles and a stutter of its buzz
    for (let k = 0; k < 5 + Math.floor(Math.random() * 6); k++) burst(t + rand(0, 1.4), rand(0.01, 0.04), "highpass", 3000, 0.7, rand(0.04, 0.1));
    const hum = ctx.createOscillator();
    hum.type = "sawtooth";
    hum.frequency.value = 120;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let k = 0; k < 6; k++) g.gain.setValueAtTime(k % 2 ? 0.0001 : 0.03, t + k * rand(0.08, 0.2));
    g.gain.setValueAtTime(0.0001, t + 1.5);
    hum.connect(bp).connect(g).connect(pan);
    hum.start(t);
    hum.stop(t + 1.6);
  }
}

/** A far-away event in a huge empty building: mostly reverb, barely any direct sound. */
function distant(ctx: AudioContext, noise: AudioBuffer, out: AudioNode) {
  const t = ctx.currentTime;
  const pan = ctx.createStereoPanner();
  pan.pan.value = rand(-0.9, 0.9);
  pan.connect(out);
  const kind = Math.random();
  if (kind < 0.4) {
    // a heavy door or a metal panel, somewhere
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = rand(180, 420);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(rand(0.25, 0.5), t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.4, 0.9));
    src.connect(lp).connect(env).connect(pan);
    src.start(t, rand(0, NOISE_SECONDS - 1), 1.2);
  } else if (kind < 0.75) {
    // footsteps that are not yours
    const n = 4 + Math.floor(Math.random() * 5);
    const gap = rand(0.45, 0.62);
    for (let k = 0; k < n; k++) {
      const at = t + k * gap;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 450;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(0.09 * (1 - k / (n + 2)), at + 0.015);
      env.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
      src.connect(lp).connect(env).connect(pan);
      src.start(at, rand(0, NOISE_SECONDS - 1), 0.15);
    }
  } else {
    // the building groaning: a slow, very low tone
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(rand(38, 55), t);
    osc.frequency.linearRampToValueAtTime(rand(30, 45), t + 3);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.18, t + 1.2);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    osc.connect(env).connect(pan);
    osc.start(t);
    osc.stop(t + 3.6);
  }
}

/** A drop of water falling into a still pool, somewhere in the room. */
function drip(ctx: AudioContext, out: AudioNode) {
  const t = ctx.currentTime;
  const pan = ctx.createStereoPanner();
  pan.pan.value = rand(-0.9, 0.9);
  pan.connect(out);
  const osc = ctx.createOscillator();
  const f = rand(1100, 2400);
  osc.frequency.setValueAtTime(f, t);
  osc.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.06);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(rand(0.03, 0.07), t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(env).connect(pan);
  osc.start(t);
  osc.stop(t + 0.15);
}

/** Muzak from a shop that closed years ago: four slow chords, filtered, far away. */
function muzak(ctx: AudioContext, out: AudioNode): () => void {
  const chords = [[261.6, 329.6, 392], [220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6]];
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 700;
  const g = ctx.createGain();
  g.gain.value = 0.05;
  lp.connect(g).connect(out);
  let k = 0;
  const play = () => {
    const t = ctx.currentTime;
    for (const f of chords[k % chords.length]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f * rand(0.995, 1.005); // slightly out of tune, like a tired tape
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(0.25, t + 0.6);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
      o.connect(e).connect(lp);
      o.start(t);
      o.stop(t + 4);
    }
    k++;
  };
  play();
  const id = setInterval(play, 4000);
  return () => clearInterval(id);
}

/** A synthetic room tail (decaying stereo noise): convincing for big, empty, hard spaces. */
function impulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  return buf;
}

function build(ctx: AudioContext, id: AmbienceId, noise: { brown: AudioBuffer; white: AudioBuffer }, out: AudioNode): Layer | null {
  if (id === "none") return null;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(out);
  const sources: AudioScheduledSourceNode[] = [];
  const timers: (() => void)[] = [];

  if (id === "wind") {
    // two wind bands drifting independently, plus gusts at random moments
    for (const [freq, level] of [[380, 0.6], [900, 0.18]] as const) {
      const src = loop(ctx, noise.brown);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      src.connect(filter).connect(g).connect(gain);
      sources.push(src);
      timers.push(
        every(2.5, 7, () => {
          const now = ctx.currentTime;
          const gust = rand(0.6, 1.6);
          g.gain.setTargetAtTime(level * gust, now, rand(0.8, 2));
          filter.frequency.setTargetAtTime(freq * (0.7 + gust * 0.5), now, rand(0.8, 2));
        }),
      );
    }
    timers.push(every(4, 13, () => chirp(ctx, gain)));
  } else if (id === "water") {
    // still water lapping against tiles, drips, a faint hum of pumps
    const src = loop(ctx, noise.brown);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 520;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(bp).connect(g).connect(gain);
    sources.push(src);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.18;
    const depth = ctx.createGain();
    depth.gain.value = 0.18;
    lfo.connect(depth).connect(g.gain);
    lfo.start();
    sources.push(lfo);
    const pump = ctx.createOscillator();
    pump.frequency.value = 58;
    const pg = ctx.createGain();
    pg.gain.value = 0.05;
    pump.connect(pg).connect(gain);
    pump.start();
    sources.push(pump);
    timers.push(every(0.6, 3.2, () => drip(ctx, gain)));
  } else if (id === "city") {
    // a city with nobody in it: a low rumble, wind between towers, now and then something far away
    for (const [freq, level] of [[36, 0.14], [37.4, 0.1]] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(gain);
      osc.start();
      sources.push(osc);
    }
    const src = loop(ctx, noise.brown);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 340;
    const g = ctx.createGain();
    g.gain.value = 0.45;
    src.connect(lp).connect(g).connect(gain);
    sources.push(src);
    timers.push(every(14, 40, () => distant(ctx, noise.white, gain)));
  } else if (id === "nursery") {
    // a big quiet room: soft air (the music box is the carousel's, placed in the room)
    const src = loop(ctx, noise.brown);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500;
    const air = ctx.createGain();
    air.gain.value = 0.18;
    src.connect(lp).connect(air).connect(gain);
    sources.push(src);
  } else if (id === "garden") {
    // indoors that feel outdoors: a light breeze, leaves, birds a little too far away
    const src = loop(ctx, noise.brown);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    const g = ctx.createGain();
    g.gain.value = 0.3;
    src.connect(lp).connect(g).connect(gain);
    sources.push(src);
    const leaves = loop(ctx, noise.white);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3200;
    bp.Q.value = 0.6;
    const lg = ctx.createGain();
    lg.gain.value = 0.015;
    leaves.connect(bp).connect(lg).connect(gain);
    sources.push(leaves);
    timers.push(every(4, 9, () => lg.gain.setTargetAtTime(rand(0.005, 0.04), ctx.currentTime, 1.2)));
    timers.push(every(3, 9, () => chirp(ctx, gain)));
  } else if (id === "purple") {
    // a low, soft pad that hardly moves
    for (const [f, l] of [[55, 0.12], [82.4, 0.07], [110.3, 0.05], [164.8, 0.02]] as const) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = l;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rand(0.03, 0.08);
      const depth = ctx.createGain();
      depth.gain.value = l * 0.6;
      lfo.connect(depth).connect(og.gain);
      o.connect(og).connect(gain);
      o.start();
      lfo.start();
      sources.push(o, lfo);
    }
  } else if (id === "quiet") {
    // almost nothing: still air, one tube buzzing somewhere
    const src = loop(ctx, noise.brown);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    const g = ctx.createGain();
    g.gain.value = 0.09;
    src.connect(lp).connect(g).connect(gain);
    sources.push(src);
    const buzz = ctx.createOscillator();
    buzz.frequency.value = 100;
    const bg = ctx.createGain();
    bg.gain.value = 0.012;
    buzz.connect(bg).connect(gain);
    buzz.start();
    sources.push(buzz);
  } else if (id === "mall") {
    // fluorescent hum, the far muzak, footsteps in another gallery
    const src = loop(ctx, noise.brown);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    const air = ctx.createGain();
    air.gain.value = 0.2;
    src.connect(bp).connect(air).connect(gain);
    sources.push(src);
    timers.push(muzak(ctx, gain));
    timers.push(every(18, 45, () => distant(ctx, noise.white, gain)));
  } else if (id === "lobby") {
    // weight: a low drone that beats against itself, the buzz of a thousand tubes, stale air, distant events
    for (const [freq, level] of [[47, 0.16], [48.6, 0.12], [96, 0.05]] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(gain);
      osc.start();
      sources.push(osc);
    }
    const buzz = ctx.createOscillator();
    buzz.type = "sawtooth";
    buzz.frequency.value = 120;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2200;
    bp.Q.value = 3;
    const bg = ctx.createGain();
    bg.gain.value = 0.016;
    buzz.connect(bp).connect(bg).connect(gain);
    buzz.start();
    sources.push(buzz);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 0.008;
    lfo.connect(depth).connect(bg.gain);
    lfo.start();
    sources.push(lfo);
    const air = loop(ctx, noise.brown);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 260;
    const ag = ctx.createGain();
    ag.gain.value = 0.3;
    air.connect(lp).connect(ag).connect(gain);
    sources.push(air);
    timers.push(every(10, 32, () => distant(ctx, noise.white, gain)));
    // and closer, rarer: someone knocking in a wall, whispers you cannot make out, a tube crackling overhead
    timers.push(every(35, 90, () => uncanny(ctx, noise.white, gain)));
  } else {
    // mains hum of fluorescent tubes + faint ventilation
    const src = loop(ctx, noise.brown);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    const air = ctx.createGain();
    air.gain.value = 0.25;
    src.connect(filter).connect(air).connect(gain);
    sources.push(src);
    for (const [freq, level] of [[100, 0.05], [200, 0.02]] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(gain);
      osc.start();
      sources.push(osc);
    }
  }
  return {
    gain,
    stop: () => {
      timers.forEach((stop) => stop());
      sources.forEach((s) => s.stop());
    },
  };
}

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: { brown: AudioBuffer; white: AudioBuffer } | null = null;
  private layer: Layer | null = null;
  private current: AmbienceId = "none";
  private level = 0;
  /** everything goes through the bus: dry to the master, and a share to the reverb */
  private bus: GainNode | null = null;
  private send: GainNode | null = null;
  private space = 0;
  /** sounds placed in the zone, each with its own voice, levelled by distance in listen() */
  private emitters: { e: Emitter; v: Voice | null }[] = [];

  /** Must run inside a user gesture. Safe to call repeatedly. */
  start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.level;
    this.master.connect(this.ctx.destination);
    this.bus = this.ctx.createGain();
    this.bus.connect(this.master);
    this.send = this.ctx.createGain();
    this.send.gain.value = this.space;
    const verb = this.ctx.createConvolver();
    verb.buffer = impulse(this.ctx, 3.4);
    this.bus.connect(this.send).connect(verb).connect(this.master);
    this.noise = { brown: noiseBuffer(this.ctx, true), white: noiseBuffer(this.ctx, false) };
    const wanted = this.current;
    this.current = "none";
    this.play(wanted);
  }

  /** Crossfades to the zone's ambience (remembered until start() if sound is not allowed yet). */
  play(id: AmbienceId) {
    if (id === this.current) return;
    this.current = id;
    const { ctx, noise } = this;
    const master = this.bus;
    if (!ctx || !master || !noise) return;
    const now = ctx.currentTime;
    const old = this.layer;
    if (old) {
      old.gain.gain.setTargetAtTime(0, now, CROSSFADE / 4);
      setTimeout(old.stop, CROSSFADE * 1500);
    }
    this.layer = build(ctx, id, noise, master);
    this.layer?.gain.gain.setTargetAtTime(1, now, CROSSFADE / 4);
  }

  /** The placed sounds of the zone we are in (replaces the previous zone's). */
  setEmitters(list: readonly Emitter[]) {
    for (const { v } of this.emitters) {
      if (!v || !this.ctx) continue;
      v.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      setTimeout(v.stop, 1500);
    }
    this.emitters = list.map((e) => ({ e, v: null }));
  }

  /** Levels each placed sound from where the listener stands (and what is switched on): a few times a second. */
  listen(x: number, z: number, used: ReadonlySet<string>) {
    const { ctx, noise } = this;
    if (!ctx || !noise || !this.bus) return;
    for (const slot of this.emitters) {
      const { e } = slot;
      const on = (!e.needs || used.has(e.needs)) && (!e.mute || !used.has(e.mute));
      const d = Math.hypot(x - e.x, z - e.z);
      const level = on && d < e.radius ? (1 - d / e.radius) ** 2 * (e.level ?? 1) : 0;
      if (level > 0 && !slot.v) slot.v = voice(ctx, e.kind, noise, this.bus);
      slot.v?.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.25);
    }
  }

  /** One footstep: a soft brush in grass, a short tap on hard floors. Running = louder, brighter. */
  step(surface: Surface, run: boolean) {
    const { ctx, noise } = this;
    const master = this.bus;
    if (!ctx || !master || !noise) return;
    const t = ctx.currentTime;
    if (surface === "tile") {
      // wet ceramic: a bright click and a short ring off the tiled walls around
      const click = ctx.createBufferSource();
      click.buffer = noise.white;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = rand(1700, 2300) * (run ? 1.15 : 1);
      bp.Q.value = 2.2;
      const env = ctx.createGain();
      const peak = 0.24 * (run ? 1.4 : 1) * rand(0.8, 1.1);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(peak, t + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.05, 0.07));
      click.connect(bp).connect(env).connect(master);
      click.start(t, rand(0, NOISE_SECONDS - 1), 0.1);
      const ring = ctx.createOscillator();
      ring.frequency.value = rand(2600, 3200);
      const rg = ctx.createGain();
      rg.gain.setValueAtTime(0.0001, t);
      rg.gain.exponentialRampToValueAtTime(0.012, t + 0.006);
      rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      ring.connect(rg).connect(master);
      ring.start(t);
      ring.stop(t + 0.2);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = noise.white;
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    // grass: a soft brush · carpet: a muffled pat · hard floors: a short tap
    const len = surface === "hard" ? rand(0.05, 0.08) : surface === "carpet" ? rand(0.08, 0.11) : rand(0.12, 0.18);
    filter.type = surface === "carpet" ? "lowpass" : "bandpass";
    filter.frequency.value = (surface === "grass" ? rand(1500, 2600) : surface === "carpet" ? rand(380, 560) : rand(700, 1100)) * (run ? 1.2 : 1);
    filter.Q.value = surface === "grass" ? 0.7 : surface === "carpet" ? 0.5 : 1.4;
    const peak = (surface === "grass" ? 0.16 : surface === "carpet" ? 0.3 : 0.22) * (run ? 1.4 : 1) * rand(0.75, 1.1);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(filter).connect(env).connect(master);
    src.start(t, rand(0, NOISE_SECONDS - 1), len + 0.05);
  }

  /** One-shot effects. */
  sfx(name: Sfx) {
    const { ctx, noise } = this;
    const master = this.bus;
    if (!ctx || !master || !noise) return;
    const t = ctx.currentTime;
    if (name === "switch" || name === "pickup") {
      // a small switch: two clicks; a handset lifted: a clunk
      const click = (at: number, f: number, level: number) => {
        const src = ctx.createBufferSource();
        src.buffer = noise.white;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = f;
        bp.Q.value = 3;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, at);
        env.gain.exponentialRampToValueAtTime(level, at + 0.003);
        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
        src.connect(bp).connect(env).connect(master);
        src.start(at, rand(0, NOISE_SECONDS - 1), 0.06);
      };
      if (name === "switch") {
        click(t, 3200, 0.3);
        click(t + 0.05, 2200, 0.18);
      } else {
        click(t, 600, 0.4);
        click(t + 0.12, 900, 0.2);
      }
      return;
    }
    if (name === "door-locked") {
      // the handle turns, the latch knocks against the strike plate a few times
      for (let i = 0; i < 3; i++) {
        const at = t + i * rand(0.09, 0.13);
        const knock = ctx.createBufferSource();
        knock.buffer = noise.white;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = rand(500, 800);
        bp.Q.value = 2;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, at);
        env.gain.exponentialRampToValueAtTime(0.35, at + 0.005);
        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
        knock.connect(bp).connect(env).connect(master);
        knock.start(at, rand(0, NOISE_SECONDS - 1), 0.1);
      }
      return;
    }
    // latch click
    const click = ctx.createBufferSource();
    click.buffer = noise.white;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2500;
    const ce = ctx.createGain();
    ce.gain.setValueAtTime(0.25, t);
    ce.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    click.connect(hp).connect(ce).connect(master);
    click.start(t, 0, 0.06);
    // hinge creak: a rough, wobbling low tone through a resonant filter
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(95, t + 0.12);
    osc.frequency.linearRampToValueAtTime(70, t + 0.7);
    osc.frequency.linearRampToValueAtTime(110, t + 1.3);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 23;
    const wobbleDepth = ctx.createGain();
    wobbleDepth.gain.value = 12;
    wobble.connect(wobbleDepth).connect(osc.frequency);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1300;
    bp.Q.value = 6;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t + 0.12);
    env.gain.exponentialRampToValueAtTime(0.12, t + 0.3);
    env.gain.setTargetAtTime(0.0001, t + 1.1, 0.15);
    osc.connect(bp).connect(env).connect(master);
    osc.start(t + 0.12);
    wobble.start(t + 0.12);
    osc.stop(t + 1.8);
    wobble.stop(t + 1.8);
  }

  /** 0..1: how much the place echoes (open meadow: none; the Lobby: a lot) */
  setSpace(amount: number) {
    this.space = amount;
    if (this.ctx && this.send) this.send.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.4);
  }

  /** volume 0..1 (from the menu); muted wins. */
  setLevel(volume: number, muted: boolean) {
    this.level = muted ? 0 : Math.max(0, Math.min(1, volume)) * MAX_VOLUME;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.1);
  }

  dispose() {
    this.layer?.stop();
    this.emitters.forEach(({ v }) => v?.stop());
    this.emitters = [];
    void this.ctx?.close();
    this.ctx = this.master = this.noise = this.layer = this.bus = this.send = null;
  }
}
