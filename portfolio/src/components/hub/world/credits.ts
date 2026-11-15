/**
 * Third-party resources used in the hub. CC0 needs no credit (listed anyway, it is polite); CC-BY must be credited:
 * shown in the menu's « Crédits » tab. Never NoAI, NC, ND or unclear licences (see .claude/decisions.md).
 */
export type Credit = { title: string; author: string; url: string; licence: "CC0" | "CC-BY 4.0" | "CC-BY 3.0" | "MIT"; usedIn: string };

export const CREDITS: Credit[] = [];

/** What is made in-house, to say so in the same tab. */
export const MADE_HERE = "Modèles 3D générés par script dans Blender, textures et sons synthétisés dans le navigateur.";
