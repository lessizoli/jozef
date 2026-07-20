import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";
import "./auth.css";

export const metadata: Metadata = {
  title: "Envision CRM",
  description: "Projektmenedzsment és kivitelezéskezelő rendszer",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
