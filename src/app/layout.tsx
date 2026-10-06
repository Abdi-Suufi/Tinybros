import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from '@vercel/analytics/next';
import Navbar from "@/components/Navbar";
import BackToTopButton from "@/components/BackToTopButton";
import { Providers } from "./Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-1648425218847882';

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
      <head>
        {adsenseClientId && (
          <Script
            id="google-adsense-script"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className={`${inter.className} min-h-screen`} suppressHydrationWarning>
        <Providers>
          <Navbar />
          <main className="w-full">
            {children}
          </main>
          <BackToTopButton />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
