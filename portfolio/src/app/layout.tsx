import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToastProvider } from "@/components/ui/toast-context";
import { headers } from "next/headers";
import "./globals.css";

export const metadata = {
  title: "Nizard Verdenal - Portfolio",
  description: "Portfolio",
  themeColor: "#ffffff",
  icons: {
    icon: [
      { url: "/brand/nv-icon.png", type: "image/png" },
    ],
    shortcut: "/brand/nv-icon.png",
    apple: "/brand/nv-icon.png",
    other: [
      { rel: "apple-touch-icon", url: "/brand/nv-icon.png" },
      { rel: "manifest", url: "/site.webmanifest" }
    ]
  },
  keywords: [
    "Nizard Verdenal",
    "Portfolio",
    "Developer",
    "Web Developer",
    "Full-Stack Developer",
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "Next.js",
    "Python",
    "Django",
    "Student",
    "Computer Science",
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
