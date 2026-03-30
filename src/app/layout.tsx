import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "saks. | Lead-Scraper",
  description: "Webapp interna di lead-scraper per saks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-black text-white selection:bg-[#C026D3] selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
