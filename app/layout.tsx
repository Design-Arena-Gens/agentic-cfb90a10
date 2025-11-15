import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Routine Companion",
  description: "Minimalist AI companion to orchestrate your day"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
