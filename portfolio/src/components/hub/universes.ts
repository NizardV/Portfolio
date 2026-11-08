export type Universe = {
  id: string;
  name: string;
  tagline: string;
  color: string;
  /** null = universe not built yet */
  href: string | null;
};

// Add a universe here, then give it an `href` once its scene exists.
export const UNIVERSES: Universe[] = [
  { id: "backrooms", name: "Backrooms", tagline: "Game dev · Roblox & Unity", color: "#e8c547", href: null },
  { id: "vigil", name: "Vigil", tagline: "Monitoring · data · automatisation", color: "#4fd1c5", href: null },
  { id: "infra", name: "Infra", tagline: "VPS · Docker · self-hosting", color: "#5b8cff", href: null },
];
