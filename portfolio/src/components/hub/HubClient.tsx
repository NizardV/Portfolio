"use client";
import dynamic from "next/dynamic";
import Link from "next/link";

// three.js only loads on this route, never in the main portfolio bundle.
const HubScene = dynamic(() => import("./HubScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm tracking-widest text-white/60">
      OUVERTURE DU PORTAIL…
    </div>
  ),
});

export default function HubClient() {
  return (
    <div className="fixed inset-0 bg-[#05060a] text-white">
      <HubScene />
      <Link
        href="/"
        className="absolute left-4 top-4 rounded-full border border-white/20 px-4 py-2 text-xs tracking-widest text-white/70 backdrop-blur transition hover:text-white"
      >
        ← RETOUR
      </Link>
    </div>
  );
}
