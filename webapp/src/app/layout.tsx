import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

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
    <html lang="en" data-theme="cosmic" className="bg-cosmic-900">
      <body className="font-sans antialiased bg-cosmic-900 text-quantum-300">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
