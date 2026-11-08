import WorldClient from "@/components/hub/world/WorldClient";

// Hub v2 under construction: not linked anywhere yet, the current /hub stays live until it is ready.
export const metadata = {
  title: "Hub — Nizard Verdenal",
  robots: { index: false, follow: false },
};

export default function HubV2Page() {
  return <WorldClient />;
}
