import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SimProvider } from "@/lib/sim-context";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "PolisAI — AI Societal Digital Twin",
  description: "Test policy, governance, economics, climate, healthcare, mobility, and civic outcomes in a living simulated city.",
  manifest: "/manifest.json",
  themeColor: "#009E9D",
  appleWebApp: {
    capable: true,
    title: "PolisAI",
    statusBarStyle: "black-translucent",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <AuthProvider>
          <SimProvider>
            {children}
          </SimProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
