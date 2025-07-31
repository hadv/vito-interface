import React from 'react';
import './PhantomIcon.css';

interface PhantomIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const PhantomIcon: React.FC<PhantomIconProps> = ({ 
  size = 32, 
  className = '', 
  style = {} 
}) => {
  // Generate unique gradient ID to avoid conflicts
  const gradientId = `phantomGradient-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`phantom-icon ${className}`}
      style={{ display: 'block', ...style }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#AB9FF2"/>
          <stop offset="100%" stopColor="#7C3AED"/>
        </linearGradient>
      </defs>
      
      {/* Background rounded rectangle with gradient */}
      <rect 
        width="32" 
        height="32" 
        rx="8" 
        fill={`url(#${gradientId})`}
      />
      
      {/* Phantom ghost shape - official design */}
      <path 
        d="M7 11.5C7 7.91015 9.91015 5 13.5 5H18.5C22.0899 5 25 7.91015 25 11.5V20.5C25 22.5 24.5 24.5 22.5 25.5C21.5 26 20.5 25.5 19.8 24.8C19.3 24.3 18.7 23.8 17.5 23.8C16.3 23.8 15.7 24.3 15.2 24.8C14.5 25.5 13.5 26 12.5 25.5C10.5 24.5 7 22.5 7 20.5V11.5Z" 
        fill="white"
      />
      
      {/* Left eye */}
      <ellipse 
        cx="12" 
        cy="13.5" 
        rx="1.2" 
        ry="1.8" 
        fill="#7C3AED"
      />
      
      {/* Right eye */}
      <ellipse 
        cx="20" 
        cy="13.5" 
        rx="1.2" 
        ry="1.8" 
        fill="#7C3AED"
      />
      
      {/* Mouth - subtle smile */}
      <path 
        d="M14.5 18.5C14.5 18.5 15.2 19.2 16 19.2C16.8 19.2 17.5 18.5 17.5 18.5" 
        stroke="#7C3AED" 
        strokeWidth="1.2" 
        strokeLinecap="round"
      />
    </svg>
  );
};

export default PhantomIcon;
