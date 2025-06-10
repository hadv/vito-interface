import React from 'react';
import { cn } from '../../utils/cn';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fallback?: string;
  address?: string;
  className?: string;
}

const getAvatarClasses = (size: AvatarProps['size'] = 'md') => {
  const baseClasses = [
    'relative inline-flex items-center justify-center',
    'rounded-full overflow-hidden',
    'bg-gradient-to-br from-primary-500 to-secondary-500',
    'text-white font-medium flex-shrink-0',
    'border-2 border-white/10 shadow-md'
  ];

  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-18 h-18 text-xl shadow-lg',
    '2xl': 'w-24 h-24 text-2xl shadow-xl'
  };

  return cn(baseClasses, sizeClasses[size]);
};

const getImageClasses = () => 'w-full h-full object-cover';

const getFallbackClasses = () => cn(
  'flex items-center justify-center',
  'w-full h-full uppercase'
);

// Generate a consistent color based on address
const generateAvatarGradient = (address: string): React.CSSProperties => {
  if (!address) return {};

  const hash = address.slice(2, 8); // Use first 6 chars after 0x
  const hue1 = parseInt(hash.slice(0, 2), 16) % 360;
  const hue2 = (hue1 + 60) % 360;

  return {
    background: `linear-gradient(135deg, hsl(${hue1}, 70%, 50%) 0%, hsl(${hue2}, 70%, 60%) 100%)`
  };
};

// Generate Ethereum-style blockies avatar URL
const generateBlockiesUrl = (address: string, size: number = 8): string => {
  if (!address) return '';
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}&size=${size * 10}`;
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  fallback,
  address,
  className,
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);

  // Generate fallback text
  const getFallbackText = (): string => {
    if (fallback) return fallback.slice(0, 2);
    if (address) return address.slice(2, 4).toUpperCase();
    return '??';
  };

  // Generate avatar source
  const getAvatarSrc = (): string => {
    if (src && !imageError) return src;
    if (address) return generateBlockiesUrl(address);
    return '';
  };

  const avatarSrc = getAvatarSrc();
  const gradientStyle = address ? generateAvatarGradient(address) : {};
  const avatarClasses = getAvatarClasses(size);

  return (
    <div
      className={cn(avatarClasses, className)}
      style={gradientStyle}
      {...props}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={alt || 'Avatar'}
          className={getImageClasses()}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className={getFallbackClasses()}>
          {getFallbackText()}
        </div>
      )}
    </div>
  );
};

export default Avatar;
