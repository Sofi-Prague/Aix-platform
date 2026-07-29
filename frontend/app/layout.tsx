import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIX — Adaptive Intelligence Index Platform",
  description: "Build, validate, and publish composite scientific indexes without code.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
