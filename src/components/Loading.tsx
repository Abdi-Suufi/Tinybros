export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="relative w-24 h-24 mb-8">
        {/* Outer ring */}
        <div className="absolute inset-0 border-4 border-sky-500/30 rounded-full"></div>
        {/* Spinning ring */}
        <div className="absolute inset-0 border-4 border-t-sky-500 border-r-teal-500 rounded-full animate-spin"></div>
        {/* Inner circle */}
        <div className="absolute inset-2 bg-gradient-to-r from-sky-500 to-teal-500 rounded-full animate-pulse"></div>
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
        <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
} 