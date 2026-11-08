/**
 * Ambient sound, synthesised with the Web Audio API: no audio file to download for the foundations.
 * Recorded CC0 ambiences will replace these per zone later; the crossfade logic stays.
 * Browsers only allow sound after a user gesture: call start() from a click / key / touch handler.
 */
export type AmbienceId = "wind" | "hum" | "none";

const VOLUME = 0.22; // low by default
const CROSSFADE = 1.5; // seconds

type Layer = { gain: GainNode; stop: () => void };

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown-ish noise: soft, not hissy
    data[i] = last * 3.5;
  }
  return buffer;
}

function build(ctx: AudioContext, id: AmbienceId, noise: AudioBuffer, out: AudioNode): Layer | null {
  if (id === "none") return null;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(out);
  const sources: AudioScheduledSourceNode[] = [];

  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  src.connect(filter);
  sources.push(src);

  if (id === "wind") {
    // filtered noise whose loudness and colour drift slowly: gusts
    filter.type = "lowpass";
    filter.frequency.value = 500;
    const level = ctx.createGain();
    level.gain.value = 0.7;
    filter.connect(level).connect(gain);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const depth = ctx.createGain();
    depth.gain.value = 0.35;
    lfo.connect(depth).connect(level.gain);
    const sweep = ctx.createGain();
    sweep.gain.value = 250;
    lfo.connect(sweep).connect(filter.frequency);
    sources.push(lfo);
  } else {
    // mains hum of fluorescent tubes + faint ventilation
    filter.type = "bandpass";
    filter.frequency.value = 900;
    const air = ctx.createGain();
    air.gain.value = 0.25;
    filter.connect(air).connect(gain);
    for (const [freq, level] of [[100, 0.05], [200, 0.02]] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(gain);
      sources.push(osc);
    }
  }
  sources.forEach((s) => s.start());
  return { gain, stop: () => sources.forEach((s) => s.stop()) };
}

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private layer: Layer | null = null;
  private current: AmbienceId = "none";
  private muted = false;

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
    this.master.gain.value = this.muted ? 0 : VOLUME;
    this.master.connect(this.ctx.destination);
    this.noise = noiseBuffer(this.ctx);
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

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(muted ? 0 : VOLUME, this.ctx.currentTime, 0.1);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = this.master = this.noise = this.layer = null;
  }
}
