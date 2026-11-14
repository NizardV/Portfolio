/**
 * Long computations written as generators that `yield` now and then: run them in one go (`drain`), or a few
 * milliseconds at a time between frames (`sliced`), so building a 160 m place never freezes the dream.
 */
export type Steps<T> = Generator<void, T, void>;

export function drain<T>(steps: Steps<T>): T {
  for (;;) {
    const r = steps.next();
    if (r.done) return r.value;
  }
}

/** milliseconds of work per slice; may be raised while it runs (someone is now waiting for the result) */
export type Budget = { ms: number };

export function sliced<T>(steps: Steps<T>, budget: Budget = { ms: 6 }): Promise<T> {
  return new Promise((resolve, reject) => {
    const tick = () => {
      const end = performance.now() + budget.ms;
      try {
        for (;;) {
          const r = steps.next();
          if (r.done) return resolve(r.value);
          if (performance.now() > end) break;
        }
      } catch (e) {
        return reject(e);
      }
      setTimeout(tick, 0);
    };
    tick();
  });
}
