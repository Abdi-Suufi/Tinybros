'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { useWatchlist } from "@/components/WatchlistContext";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import WatchlistAccount from "@/components/WatchlistAccount";

interface NavItem {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  icon: ReactNode;
}

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  className: "h-5 w-5 flex-shrink-0",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.8,
  "aria-hidden": true,
} as const;

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Home",
    isActive: (pathname) => pathname === "/",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
      </svg>
    ),
  },
  {
    href: "/movies",
    label: "Movies",
    isActive: (pathname) => pathname.startsWith("/movies"),
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="4.5" width="18" height="15" rx="2" />
        <path strokeLinecap="round" d="M7.5 4.5v15M16.5 4.5v15M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21" />
      </svg>
    ),
  },
  {
    href: "/series",
    label: "Shows",
    isActive: (pathname) => pathname.startsWith("/series") || pathname.startsWith("/shows"),
    icon: (
      <svg {...iconProps}>
        <rect x="2.5" y="4" width="19" height="13" rx="2" />
        <path strokeLinecap="round" d="M8 20.5h8M12 17v3.5" />
      </svg>
    ),
  },
  {
    href: "/anime",
    label: "Anime",
    isActive: (pathname) => pathname.startsWith("/anime"),
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.5a.56.56 0 011.04 0l2.13 5.11a.56.56 0 00.47.34l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 00-.18.56l1.28 5.39a.56.56 0 01-.84.61l-4.73-2.89a.56.56 0 00-.58 0l-4.73 2.89a.56.56 0 01-.84-.61l1.28-5.39a.56.56 0 00-.18-.56l-4.2-3.6a.56.56 0 01.32-.99l5.52-.44a.56.56 0 00.47-.34l2.13-5.11z" />
      </svg>
    ),
  },
];

// Icon buttons inside the pill (search and account) share this look
const PILL_ICON_BUTTON =
  "rounded-lg p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400";

export default function Navbar() {
  const pathname = usePathname();
  const { syncMessage } = useWatchlist();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 border-b transition-[background-color,border-color] duration-300 ease-in-out ${
          isScrolled
            ? 'bg-black/90 backdrop-blur-sm border-yellow-500/20'
            : 'bg-transparent border-transparent'
        }`}
        suppressHydrationWarning
      >
        <div className="flex w-full items-center justify-between gap-2 px-3 py-3 sm:px-4" suppressHydrationWarning>
          <Link
            href="/"
            className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-opacity hover:opacity-90 sm:text-2xl"
          >
            Tinywatch
          </Link>

          {/* Icon pill: page links, then search and account */}
          <div
            data-nav-pill
            className="flex items-center gap-0.5 rounded-xl border border-yellow-500/20 bg-black/80 p-1 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            {NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-lg p-2 text-sm font-semibold transition-colors md:px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
                    active
                      ? 'bg-yellow-500/15 text-yellow-300'
                      : 'text-gray-300 hover:bg-white/10 hover:text-yellow-300'
                  }`}
                >
                  {item.icon}
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}

            <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />

            <SearchAutocomplete isScrolled={isScrolled} enableShortcut triggerClassName={PILL_ICON_BUTTON} />
            <WatchlistAccount triggerClassName={PILL_ICON_BUTTON} />
          </div>
        </div>
      </nav>

      {/* <MaintenanceBanner /> */}

      {syncMessage && pathname !== '/watchlist' && (
        <p
          role="status"
          className="fixed bottom-4 left-4 right-4 z-[90] mx-auto max-w-xl rounded-lg border border-yellow-500/30 bg-black/95 px-4 py-3 text-sm text-yellow-200 shadow-xl"
        >
          {syncMessage}
        </p>
      )}

      {/* Video Player Alert Banner - Commented out, ready to reuse if needed */}
      {/* <div className="fixed top-[60px] left-0 right-0 z-50 bg-red-600 text-white py-1.5 overflow-hidden">
        <style jsx>{`
          @keyframes scroll {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100vw);
            }
          }
          .marquee {
            display: inline-block;
            white-space: nowrap;
            animation: scroll 10s linear infinite;
          }
        `}</style>
        <div className="text-sm font-medium whitespace-nowrap">
          <span className="marquee inline-block">
            Sorry, the video players aren&apos;t currently working •
          </span>
        </div>
      </div> */}
    </>
  );
}
