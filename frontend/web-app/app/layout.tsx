import type { Metadata } from "next";
import type { ReactNode } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SimProvider } from "@/lib/sim-context";

export const metadata: Metadata = {
  title: "PolisAI — AI Societal Digital Twin",
  description: "Test policy, governance, economics, climate, healthcare, mobility, and civic outcomes in a living simulated city.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
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
