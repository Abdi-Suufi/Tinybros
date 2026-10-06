export default function MaintenanceBanner() {
  return (
    <div className="maintenance-banner fixed top-[60px] left-0 right-0 z-40 overflow-hidden bg-orange-600 py-2 text-sm font-semibold text-white">
      <style jsx>{`
        @keyframes maintenance-marquee {
          from { transform: translateX(-100%); }
          to { transform: translateX(100vw); }
        }
        .maintenance-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: maintenance-marquee 6s linear infinite;
        }
        .maintenance-banner:hover .maintenance-marquee {
          animation-play-state: paused;
        }
      `}</style>
      <span className="maintenance-marquee">
        Update: The site will be undergoing maintenance on the 18th from 10:00 PM to 00:00 AM GMT.
      </span>
    </div>
  );
}
