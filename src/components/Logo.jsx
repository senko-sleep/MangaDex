// MangaFox Logo - Book with Fox Tail
export function Logo({ size = 36, className = '' }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 64 64" 
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="logoTailGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c2410c"/>
          <stop offset="30%" stopColor="#ea580c"/>
          <stop offset="60%" stopColor="#f97316"/>
          <stop offset="100%" stopColor="#fb923c"/>
        </linearGradient>
        <linearGradient id="logoBookGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3f3f46"/>
          <stop offset="100%" stopColor="#27272a"/>
        </linearGradient>
      </defs>
      
      {/* Book Back Cover */}
      <path d="M10 10 L10 52 C10 56 13 58 17 58 L42 58 C46 58 48 56 48 52 L48 10 C48 6 46 4 42 4 L17 4 C13 4 10 6 10 10 Z" fill="#18181b"/>
      
      {/* Book Pages */}
      <path d="M14 8 L14 54 L44 54 L44 8 Z" fill="#52525b"/>
      <path d="M15 9 L15 53 L43 53 L43 9 Z" fill="url(#logoBookGradient)"/>
      
      {/* Book Spine (orange) */}
      <path d="M10 10 L10 52 C10 56 13 58 17 58 L17 4 C13 4 10 6 10 10 Z" fill="#f97316"/>
      <path d="M10 10 L10 52 C10 54 11 56 13 57 L13 5 C11 6 10 8 10 10 Z" fill="#fb923c"/>
      
      {/* Book Lines */}
      <rect x="21" y="16" width="18" height="2.5" rx="1.25" fill="#71717a"/>
      <rect x="21" y="24" width="15" height="2.5" rx="1.25" fill="#71717a"/>
      <rect x="21" y="32" width="12" height="2.5" rx="1.25" fill="#71717a"/>
      
      {/* Fox Tail - Main Shape */}
      <path 
        d="M36 48 C42 44, 46 38, 50 30 C54 22, 56 14, 54 8 C52 4, 48 4, 46 8 C44 12, 46 18, 48 24 C50 30, 46 38, 40 44 C38 46, 36 48, 36 48 Z" 
        fill="url(#logoTailGradient)"
      />
      
      {/* Tail Fur Texture */}
      <path d="M48 10 C50 12, 50 16, 48 20 C46 16, 47 12, 48 10 Z" fill="#fdba74"/>
      <path d="M52 14 C54 17, 53 22, 50 26 C50 21, 51 17, 52 14 Z" fill="#fed7aa"/>
      <path d="M50 24 C52 28, 50 34, 46 38 C48 33, 49 28, 50 24 Z" fill="#fdba74"/>
      <path d="M44 36 C46 40, 42 44, 38 46 C41 43, 44 40, 44 36 Z" fill="#fcd34d"/>
      
      {/* Tail White Tip */}
      <ellipse cx="53" cy="7" rx="5" ry="4" fill="#fef3c7" transform="rotate(-45 53 7)"/>
      <ellipse cx="54" cy="6" rx="3" ry="2.5" fill="#fffbeb" transform="rotate(-45 54 6)"/>
    </svg>
  );
}

export default Logo;
