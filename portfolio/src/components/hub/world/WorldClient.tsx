"use client";
import dynamic from "next/dynamic";

// three.js and the world only load on this route, never in the main portfolio bundle.
const World = dynamic(() => import("./World"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-white" />, // the dream starts from white
});

export default function WorldClient() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <World />
    </div>
  );
}
