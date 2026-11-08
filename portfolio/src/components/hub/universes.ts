export type Universe = {
  id: string;
  name: string;
  tagline: string;
  color: string;
};

/** Personal projects that get a door (locked until their place in the dream is built). Infra lives inside Vigil. */
export const UNIVERSES: Universe[] = [
  { id: "backrooms", name: "Backrooms", tagline: "Game dev · Roblox & Unity", color: "#e8c547" },
  { id: "vigil", name: "Vigil", tagline: "Veille · sécurité · infra du VPS", color: "#4fd1c5" },
];
