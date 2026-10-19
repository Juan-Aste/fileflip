import type { Metadata } from "next";
import "./globals.css";

// Temporary root layout. Milestone 1 moves pages under app/[locale]/ with next-intl.
export const metadata: Metadata = {
  title: "FileFlip",
  description: "FileFlip",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
