'use client';

import React from 'react';

interface LogoProps {
  variant?: 'default' | 'icon-only' | 'text-only' | 'stacked';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  variant = 'default', 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: {
      icon: 'h-6 w-6',
      text: 'text-lg',
      container: 'space-x-2'
    },
    md: {
      icon: 'h-8 w-8',
      text: 'text-xl',
      container: 'space-x-2'
    },
    lg: {
      icon: 'h-10 w-10',
      text: 'text-2xl',
      container: 'space-x-3'
    },
    xl: {
      icon: 'h-12 w-12',
      text: 'text-3xl',
      container: 'space-x-3'
    }
  };

  const currentSize = sizeClasses[size];

  // Custom Heart Icon with modern design
  const HeartIcon = () => (
    <div className={`${currentSize.icon} relative`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill="url(#heartGradient)"
          className="drop-shadow-sm"
        />
      </svg>
    </div>
  );

  // Alternative: Infinity Heart Icon
  const InfinityHeartIcon = () => (
    <div className={`${currentSize.icon} relative`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="infinityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="url(#infinityGradient)"
          className="drop-shadow-sm"
        />
        <circle cx="8" cy="8" r="2" fill="white" opacity="0.3" />
        <circle cx="16" cy="8" r="2" fill="white" opacity="0.3" />
      </svg>
    </div>
  );

  // Modern P + Heart combination
  const PenziIcon = () => (
    <div className={`${currentSize.icon} relative`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="penziGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        {/* Letter P */}
        <path
          d="M6 4h8c4 0 7 3 7 7s-3 7-7 7H10v8H6V4z M10 8v6h4c2 0 3-1 3-3s-1-3-3-3h-4z"
          fill="url(#penziGradient)"
        />
        {/* Heart accent */}
        <path
          d="M22 8c0-1.5 1.5-3 3-3s3 1.5 3 3c0 2-3 4-3 4s-3-2-3-4z"
          fill="url(#penziGradient)"
          opacity="0.8"
        />
      </svg>
    </div>
  );

  // Text component
  const LogoText = () => (
    <span className={`font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent ${currentSize.text}`}>
      Penzi
    </span>
  );

  // Render based on variant
  switch (variant) {
    case 'icon-only':
      return (
        <div className={className}>
          <PenziIcon />
        </div>
      );
    
    case 'text-only':
      return (
        <div className={className}>
          <LogoText />
        </div>
      );
    
    case 'stacked':
      return (
        <div className={`flex flex-col items-center space-y-1 ${className}`}>
          <PenziIcon />
          <LogoText />
        </div>
      );
    
    default:
      return (
        <div className={`flex items-center ${currentSize.container} ${className}`}>
          <PenziIcon />
          <LogoText />
        </div>
      );
  }
};

export default Logo;