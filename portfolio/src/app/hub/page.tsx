import WorldClient from "@/components/hub/world/WorldClient";

// The Easter Egg: a first-person dream (see .claude/specs/hub.md). three.js only loads on this route.
export const metadata = {
  title: "Hub — Nizard Verdenal",
  robots: { index: false, follow: false },
  // iPhone has no Fullscreen API: « Add to Home Screen » from this page opens the dream without browser bars.
  appleWebApp: { capable: true, title: "Le rêve", statusBarStyle: "black-translucent" as const },
  manifest: "/hub.webmanifest", // scoped to /hub: never applies to the portfolio itself
  other: { "apple-mobile-web-app-capable": "yes" }, // Next only emits the newer name; older iOS needs this one
};

export const viewport = { themeColor: "#000000", viewportFit: "cover" as const };

export default function HubPage() {
  return <WorldClient />;
}
