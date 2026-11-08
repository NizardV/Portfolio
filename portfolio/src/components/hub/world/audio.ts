/**
 * All sound is synthesised with the Web Audio API: nothing to download. Recorded CC0 sounds can replace any
 * of these later; the public API (play / step / sfx) stays.
 * Browsers only allow sound after a user gesture: call start() from a click / key / touch handler.
 */
export type AmbienceId = "wind" | "hum" | "none";
export type Surface = "grass" | "hard";
export type Sfx = "door-open";

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
    this.noise = { brown: noiseBuffer(this.ctx, true), white: noiseBuffer(this.ctx, false) };
    const wanted = this.current;
    this.current = "none";
    this.play(wanted);
  }

  /** Crossfades to the zone's ambience (remembered until start() if sound is not allowed yet). */
  play(id: AmbienceId) {
    if (id === this.current) return;
    this.current = id;
    const { ctx, master, noise } = this;
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

  /** One footstep: a soft brush in grass, a short tap on hard floors. Running = louder, brighter. */
  step(surface: Surface, run: boolean) {
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise.white;
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    const len = surface === "grass" ? rand(0.12, 0.18) : rand(0.05, 0.08);
    filter.type = "bandpass";
    filter.frequency.value = (surface === "grass" ? rand(1500, 2600) : rand(700, 1100)) * (run ? 1.2 : 1);
    filter.Q.value = surface === "grass" ? 0.7 : 1.4;
    const peak = (surface === "grass" ? 0.16 : 0.22) * (run ? 1.4 : 1) * rand(0.75, 1.1);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(filter).connect(env).connect(master);
    src.start(t, rand(0, NOISE_SECONDS - 1), len + 0.05);
  }

  /** One-shot effects. */
  sfx(name: Sfx) {
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise || name !== "door-open") return;
    const t = ctx.currentTime;
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

  /** volume 0..1 (from the menu); muted wins. */
  setLevel(volume: number, muted: boolean) {
    this.level = muted ? 0 : Math.max(0, Math.min(1, volume)) * MAX_VOLUME;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.1);
  }

  dispose() {
    this.layer?.stop();
    void this.ctx?.close();
    this.ctx = this.master = this.noise = this.layer = null;
  }
}
