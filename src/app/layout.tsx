import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import Navbar from "@/components/Navbar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TinyBros - Modern Streaming Platform",
  description: "A clean and futuristic streaming service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-black text-white">
      <body className={`${inter.className} min-h-screen`} suppressHydrationWarning>
        <Navbar />
        <main className="w-full">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
