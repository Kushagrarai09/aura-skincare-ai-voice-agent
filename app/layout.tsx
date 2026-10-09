import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura Skincare — AI Voice CX Agent",
  description: "Browser-based AI customer support voice agent for Aura Skincare.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
