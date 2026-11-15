/**
 * Sounds that come from somewhere: a music box in a carousel, a radio in the grass, a phone ringing behind a wall.
 * Each is a small synthesized loop; the Ambience sets its level from the listener's distance (see audio.ts).
 * All synthesized: no audio file to download.
 */
export type EmitterKind = "musicbox" | "lullaby" | "radio" | "phone" | "creak" | "drip" | "hum" | "tv" | "clock" | "lapping";

/** A sound placed in a zone. `needs`: only while that interactable is used (switched on); `mute`: silent once it is. */
export type Emitter = { kind: EmitterKind; x: number; z: number; radius: number; level?: number; needs?: string; mute?: string };

type Noise = { brown: AudioBuffer; white: AudioBuffer };
export type Voice = { gain: GainNode; stop: () => void };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function repeat(min: number, max: number, fn: () => void): () => void {
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

function ping(ctx: AudioContext, out: AudioNode, f: number, level: number, decay: number, type: OscillatorType = "sine") {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = f;
  const e = ctx.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(level, t + 0.004);
  e.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(e).connect(out);
  o.start(t);
  o.stop(t + decay + 0.05);
}

/** A comb of tuned teeth: a tune played note by note, slightly out of tune; `drag` = the spring runs low sometimes. */
function tune(ctx: AudioContext, out: AudioNode, notes: number[], beat: number, drag: boolean): () => void {
  let k = 0;
  let b = beat;
  let id: ReturnType<typeof setTimeout>;
  const next = () => {
    const n = notes[k % notes.length];
    if (n) {
      const f = 440 * 2 ** ((n - 69) / 12) * rand(0.994, 1.006);
      ping(ctx, out, f, 0.5, 1.6);
      ping(ctx, out, f * 2.01, 0.18, 0.6);
      ping(ctx, out, f * 3.98, 0.06, 0.25);
    }
    k++;
    if (drag && k % notes.length === 0) b = Math.random() < 0.35 ? beat * 1.5 : beat;
    else if (b > beat) b += beat * 0.025;
    id = setTimeout(next, b * 1000);
  };
  id = setTimeout(next, 600);
  return () => clearTimeout(id);
}

const LULLABY = [72, 76, 79, 76, 77, 74, 0, 71, 72, 76, 74, 72, 71, 67, 0, 0, 69, 72, 76, 74, 72, 71, 72, 0];
const CRADLE = [67, 0, 72, 0, 71, 69, 67, 0, 64, 0, 65, 67, 69, 0, 67, 0, 0, 0];

export function voice(ctx: AudioContext, kind: EmitterKind, noise: Noise, out: AudioNode): Voice {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(out);
  const nodes: AudioScheduledSourceNode[] = [];
  const timers: (() => void)[] = [];
  const looped = (buffer: AudioBuffer) => {
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.loop = true;
    s.start(0, rand(0, buffer.duration));
    nodes.push(s);
    return s;
  };

  if (kind === "musicbox" || kind === "lullaby") {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 300;
    const g = ctx.createGain();
    g.gain.value = 0.16;
    hp.connect(g).connect(gain);
    timers.push(kind === "musicbox" ? tune(ctx, hp, LULLABY, 0.42, true) : tune(ctx, hp, CRADLE, 0.7, false));
  } else if (kind === "radio") {
    // an old tune through a tiny speaker: thin chords, wobbling, and crackle
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1400;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    bp.connect(g).connect(gain);
    const chords = [[60, 64, 67], [57, 60, 64], [62, 65, 69], [55, 59, 62]];
    let k = 0;
    const play = () => {
      const t = ctx.currentTime;
      for (const n of chords[k++ % chords.length]) {
        const o = ctx.createOscillator();
        o.type = "square";
        o.frequency.value = 440 * 2 ** ((n - 69) / 12) * rand(0.99, 1.01);
        const e = ctx.createGain();
        e.gain.setValueAtTime(0.0001, t);
        e.gain.exponentialRampToValueAtTime(0.06, t + 0.08);
        e.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
        o.connect(e).connect(bp);
        o.start(t);
        o.stop(t + 2);
      }
    };
    play();
    const id = setInterval(play, 2000);
    timers.push(() => clearInterval(id));
    const crackle = looped(noise.white);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3000;
    const cg = ctx.createGain();
    cg.gain.value = 0.05;
    crackle.connect(hp).connect(cg).connect(gain);
  } else if (kind === "phone") {
    // two tones warbling, two seconds on, four off
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(gain);
    for (const f of [440, 480]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = 0.1;
      o.connect(og).connect(g);
      o.start();
      nodes.push(o);
    }
    const ring = () => {
      const t = ctx.currentTime;
      for (let i = 0; i < 40; i++) g.gain.setValueAtTime(i % 2 ? 0 : 1, t + i * 0.05);
      g.gain.setValueAtTime(0, t + 2);
    };
    ring();
    const id = setInterval(ring, 6000);
    timers.push(() => clearInterval(id));
  } else if (kind === "creak") {
    // a swing: one slow creak each way
    timers.push(
      repeat(1.3, 1.6, () => {
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(rand(180, 240), t);
        o.frequency.linearRampToValueAtTime(rand(120, 160), t + 0.5);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1100;
        bp.Q.value = 5;
        const e = ctx.createGain();
        e.gain.setValueAtTime(0.0001, t);
        e.gain.exponentialRampToValueAtTime(0.12, t + 0.15);
        e.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(bp).connect(e).connect(gain);
        o.start(t);
        o.stop(t + 0.7);
      }),
    );
  } else if (kind === "drip") {
    timers.push(repeat(1.6, 2.4, () => {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(rand(1300, 1700), t);
      o.frequency.exponentialRampToValueAtTime(500, t + 0.08);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(e).connect(gain);
      o.start(t);
      o.stop(t + 0.2);
    }));
  } else if (kind === "hum") {
    // power lines: mains hum and a little crackle of corona
    for (const [f, l] of [[50, 0.12], [100, 0.08], [150, 0.03]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = l;
      o.connect(og).connect(gain);
      o.start();
      nodes.push(o);
    }
    const c = looped(noise.white);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 5000;
    const cg = ctx.createGain();
    cg.gain.value = 0.03;
    c.connect(hp).connect(cg).connect(gain);
  } else if (kind === "tv") {
    // snow: hiss, and the whine of the old tube
    const s = looped(noise.white);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2500;
    bp.Q.value = 0.5;
    const sg = ctx.createGain();
    sg.gain.value = 0.18;
    s.connect(bp).connect(sg).connect(gain);
    const w = ctx.createOscillator();
    w.frequency.value = 15700;
    const wg = ctx.createGain();
    wg.gain.value = 0.01;
    w.connect(wg).connect(gain);
    w.start();
    nodes.push(w);
  } else if (kind === "clock") {
    // a big clock, slow: tick… tock…
    let odd = false;
    const id = setInterval(() => {
      odd = !odd;
      ping(ctx, gain, odd ? 1900 : 1500, 0.3, 0.06, "triangle");
    }, 1100);
    timers.push(() => clearInterval(id));
  } else if (kind === "lapping") {
    const s = looped(noise.brown);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 480;
    const g = ctx.createGain();
    g.gain.value = 0.4;
    s.connect(bp).connect(g).connect(gain);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.22;
    const d = ctx.createGain();
    d.gain.value = 0.25;
    lfo.connect(d).connect(g.gain);
    lfo.start();
    nodes.push(lfo);
  }
  return {
    gain,
    stop: () => {
      timers.forEach((t) => t());
      nodes.forEach((n) => n.stop());
      gain.disconnect();
    },
  };
}
