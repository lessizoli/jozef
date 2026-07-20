import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthGate from "../components/AuthGate";
import ProjectFilesShortcut from "../components/ProjectFilesShortcut";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Envision PMS",
  description: "Projektmenedzsment és kivitelezéskezelő rendszer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hu"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthGate>
          {children}
          <ProjectFilesShortcut />
        </AuthGate>
      </body>
    </html>
  );
}
