'use client';

import { useEffect, useRef, useState } from 'react';

/** Show the button once the page has scrolled this far. */
const SHOW_AFTER_PX = 400;
const RING_RADIUS = 21;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const ringRef = useRef<SVGCircleElement | null>(null);

  useEffect(() => {
    let frame: number | null = null;

    // The ring fills as you scroll; written straight to the DOM so scrolling doesn't re-render
    const updateRing = () => {
      frame = null;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
      ringRef.current?.setAttribute('stroke-dashoffset', String(RING_LENGTH * (1 - progress)));
    };

    const handleScroll = () => {
      // React skips the re-render when the value hasn't changed
      setIsVisible(window.scrollY > SHOW_AFTER_PX);
      if (frame === null) frame = window.requestAnimationFrame(updateRing);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();
    updateRing();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      tabIndex={isVisible ? 0 : -1}
      aria-hidden={!isVisible}
      className={`group fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-yellow-500/25 bg-black/80 text-yellow-300 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[opacity,transform,background-color,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-yellow-400/60 hover:bg-yellow-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:h-14 md:w-14 ${
        isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      {/* Scroll progress ring */}
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={2} />
        <circle
          ref={ringRef}
          cx="24"
          cy="24"
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH}
        />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="relative h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 md:h-6 md:w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
      </svg>
    </button>
  );
}
