import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToastProvider } from "@/components/ui/toast-context";
import { headers } from "next/headers";
import "./globals.css";

export const metadata = {
  title: "Nizard Verdenal - Portfolio",
  description: "Nizard Verdenal, Concepteur Développeur en alternance à la CPAM de Côte-d'Or et étudiant en Mastère EADL au DIIAGE (Dijon).",
  icons: {
    icon: [
      { url: "/brand/nv-icon.png", type: "image/png" },
    ],
    shortcut: "/brand/nv-icon.png",
    apple: "/brand/nv-icon.png",
    other: [
      { rel: "apple-touch-icon", url: "/brand/nv-icon.png" },
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
    "Student",
    "Computer Science",
  ],
};

export const viewport = { themeColor: "#0b1020" };

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
