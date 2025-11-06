import { ToastProvider } from "@/components/ui/toast-context";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
