import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';
import Link from "next/link";
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
        <nav className="bg-black/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-teal-500 hover:opacity-90 transition-opacity">
              TinyBros
            </Link>
            <div className="flex space-x-6">
              <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/movies" className="text-gray-300 hover:text-white transition-colors">
                Movies
              </Link>
              <Link href="/tv" className="text-gray-300 hover:text-white transition-colors">
                TV Shows
              </Link>
              <Link href="/anime" className="text-gray-300 hover:text-white transition-colors">
                Anime
              </Link>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
