import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ClientProviders } from "@/components/providers/ClientProviders";

export const metadata: Metadata = {
  title: "Warmindo Putra Vangkalan (Pesan Dulu, Tinggal Ambil)",
  description: "Pesan menu Warmindo favoritmu tanpa antre. Bayar online, ambil saat matang.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
