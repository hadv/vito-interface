import React from 'react';
import styled from 'styled-components';
import { theme } from '../../theme';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

const StyledBadge = styled.span<{
  variant: BadgeProps['variant'];
  size: BadgeProps['size'];
  dot: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.typography.fontFamily.sans.join(', ')};
  font-weight: ${theme.typography.fontWeight.medium};
  border-radius: ${theme.borderRadius.full};
  white-space: nowrap;
  
  ${({ size, dot }) => {
    if (dot) {
      return `
        width: 8px;
        height: 8px;
        padding: 0;
      `;
    }
    
    switch (size) {
      case 'sm':
        return `
          padding: ${theme.spacing[1]} ${theme.spacing[2]};
          font-size: ${theme.typography.fontSize.xs};
          height: 20px;
        `;
      case 'lg':
        return `
          padding: ${theme.spacing[2]} ${theme.spacing[4]};
          font-size: ${theme.typography.fontSize.base};
          height: 32px;
        `;
      default:
        return `
          padding: ${theme.spacing[1]} ${theme.spacing[3]};
          font-size: ${theme.typography.fontSize.sm};
          height: 24px;
        `;
    }
  }}
  
  ${({ variant }) => {
    switch (variant) {
      case 'primary':
        return `
          background: ${theme.colors.primary[500]};
          color: ${theme.colors.text.inverse};
        `;
      case 'secondary':
        return `
          background: ${theme.colors.secondary[500]};
          color: ${theme.colors.text.inverse};
        `;
      case 'success':
        return `
          background: ${theme.colors.status.success};
          color: ${theme.colors.text.inverse};
        `;
      case 'warning':
        return `
          background: ${theme.colors.status.warning};
          color: ${theme.colors.text.inverse};
        `;
      case 'error':
        return `
          background: ${theme.colors.status.error};
          color: ${theme.colors.text.inverse};
        `;
      case 'info':
        return `
          background: ${theme.colors.status.info};
          color: ${theme.colors.text.inverse};
        `;
      default:
        return `
          background: ${theme.colors.background.elevated};
          color: ${theme.colors.text.secondary};
          border: 1px solid ${theme.colors.border.primary};
        `;
    }
  }}
`;

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  ...props
}) => {
  return (
    <StyledBadge
      variant={variant}
      size={size}
      dot={dot}
      className={className}
      {...props}
    >
      {!dot && children}
    </StyledBadge>
  );
};

export default Badge;
