import { ToastProvider } from "@/components/ui/toast-context";
import "./globals.css";

export const metadata = {
  title: "Nizard Verdenal - Portfolio",
  description: "Portfolio",
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
