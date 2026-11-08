import { permanentRedirect } from "next/navigation";

// The dream was built here before replacing the old hub: old links and home-screen shortcuts still work.
export default function HubV2Page() {
  permanentRedirect("/hub");
}
