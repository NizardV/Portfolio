"use client";
import { useEffect, useState } from "react";

// Two clues, one per platform: the Konami code (keyboard) and the logo tap (touch).
const CLUES = ["↑↑↓↓←→←→BA", "NV ×5"];

export default function EggHint() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % CLUES.length), 9000);
    return () => clearInterval(id);
  }, []);
  return (
    <span aria-hidden="true" className="egg-hint text-[10px]" data-text={CLUES[i]}>
      {CLUES[i]}
    </span>
  );
}
