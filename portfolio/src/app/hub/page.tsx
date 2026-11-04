import HubClient from "@/components/hub/HubClient";

export const metadata = {
  title: "Hub — Nizard Verdenal",
  robots: { index: false, follow: false },
};

export default function HubPage() {
  return <HubClient />;
}
