import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import Navbar from "@/components/Navbar";
import BackToTopButton from "@/components/BackToTopButton";
import Link from "next/link";
import { Providers } from "./Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tinywatch - Modern Streaming Platform",
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
        <Providers>
          <Navbar />
          <main className="w-full">
            {children}
          </main>
          <footer className="border-t border-yellow-500/20 bg-black px-4 py-6 text-center text-sm text-gray-400">
            <Link href="/privacy" className="transition-colors hover:text-yellow-300">
              Privacy Policy
            </Link>
          </footer>
          <BackToTopButton />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
