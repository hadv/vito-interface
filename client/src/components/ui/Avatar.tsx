import React from 'react';
import styled from 'styled-components';
import { theme } from '../../theme';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fallback?: string;
  address?: string;
  className?: string;
}

const StyledAvatar = styled.div<{ size: AvatarProps['size'] }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.borderRadius.full};
  overflow: hidden;
  background: linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.secondary[500]} 100%);
  color: ${theme.colors.text.inverse};
  font-weight: ${theme.typography.fontWeight.medium};
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${theme.shadows.md};
  
  ${({ size }) => {
    switch (size) {
      case 'xs':
        return `
          width: 24px;
          height: 24px;
          font-size: ${theme.typography.fontSize.xs};
        `;
      case 'sm':
        return `
          width: 32px;
          height: 32px;
          font-size: ${theme.typography.fontSize.sm};
        `;
      case 'md':
        return `
          width: 40px;
          height: 40px;
          font-size: ${theme.typography.fontSize.base};
        `;
      case 'lg':
        return `
          width: 56px;
          height: 56px;
          font-size: ${theme.typography.fontSize.lg};
        `;
      case 'xl':
        return `
          width: 72px;
          height: 72px;
          font-size: ${theme.typography.fontSize.xl};
          box-shadow: ${theme.shadows.lg};
        `;
      case '2xl':
        return `
          width: 96px;
          height: 96px;
          font-size: ${theme.typography.fontSize['2xl']};
          box-shadow: ${theme.shadows.xl};
        `;
      default:
        return `
          width: 40px;
          height: 40px;
          font-size: ${theme.typography.fontSize.base};
        `;
    }
  }}
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  text-transform: uppercase;
`;

// Generate a consistent color based on address
const generateAvatarGradient = (address: string): string => {
  if (!address) return `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.secondary[500]} 100%)`;
  
  const hash = address.slice(2, 8); // Use first 6 chars after 0x
  const hue1 = parseInt(hash.slice(0, 2), 16) % 360;
  const hue2 = (hue1 + 60) % 360;
  
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 50%) 0%, hsl(${hue2}, 70%, 60%) 100%)`;
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
  const gradient = address ? generateAvatarGradient(address) : undefined;
  
  return (
    <StyledAvatar
      size={size}
      className={className}
      style={gradient ? { background: gradient } : undefined}
      {...props}
    >
      {avatarSrc ? (
        <AvatarImage
          src={avatarSrc}
          alt={alt || 'Avatar'}
          onError={() => setImageError(true)}
        />
      ) : (
        <AvatarFallback>
          {getFallbackText()}
        </AvatarFallback>
      )}
    </StyledAvatar>
  );
};

export default Avatar;
