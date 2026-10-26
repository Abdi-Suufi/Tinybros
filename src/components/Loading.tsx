'use client';

type LoadingProps = {
  isExiting?: boolean;
};

export default function Loading({ isExiting = false }: LoadingProps) {
  return (
    <div
      className={`tinybros-loader fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-black transition-opacity duration-700 ease-in-out ${
        isExiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-label="Tinywatch is loading"
    >
      <svg
        className="tinybros-loader-wordmark"
        viewBox="0 0 800 160"
        role="img"
        aria-label="Tinywatch"
      >
        <defs>
          <linearGradient id="tinywatch-trace-gradient">
            <stop offset="0%" stopColor="#facc15" stopOpacity="0.1" />
            <stop offset="72%" stopColor="#facc15" stopOpacity="0.35" />
            <stop offset="92%" stopColor="#fff7ed" />
            <stop offset="100%" stopColor="#facc15" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <text className="tinybros-loader-outline" x="400" y="124" textAnchor="middle">
          TINYWATCH
        </text>
        <text className="tinybros-loader-trace" x="400" y="124" textAnchor="middle">
          TINYWATCH
        </text>
      </svg>
    </div>
  );
}