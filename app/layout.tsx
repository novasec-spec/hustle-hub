import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hustle Hub — the workspace for freelancers & creators",
  description: "Clients, invoices, projects, content calendar, notes, files, finances and an AI helper in one place.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#0b0d12", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
