import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hotbits TRNG Dashboard",
  description: "True Random Number Generator Dashboard - Airgapped Edition",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
