import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToastProvider } from "@/components/ui/toast-context";
import "./globals.css";

export const metadata = {
  title: "Nizard Verdenal - Portfolio",
  description: "Portfolio",
  icons: {
    icon: "/brand/nv-icon.png",
    shortcut: "/brand/nv-icon.png",
    apple: "/brand/nv-icon.png",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
