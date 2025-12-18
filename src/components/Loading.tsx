'use client';

export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center" suppressHydrationWarning>
      <div className="relative w-24 h-24 mb-8">
        {/* Outer ring */}
        <div className="absolute inset-0 border-4 border-orange-500/30 rounded-full"></div>
        {/* Spinning ring */}
        <div className="absolute inset-0 border-4 border-t-yellow-500 border-r-yellow-500 rounded-full animate-spin"></div>
        {/* Inner circle */}
        <div className="absolute inset-2 bg-gradient-to-r from-yellow-500 to-yellow-500 rounded-full animate-pulse"></div>
        {/* Logo or text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-xl">TB</span>
        </div>
      </div>
      
      <div className="text-white text-xl font-medium tracking-wider animate-pulse">
        LOADING
      </div>
      
      {/* Loading dots */}
      <div className="flex space-x-2 mt-4">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
} 