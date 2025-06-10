import React from 'react';
import styled from 'styled-components';
import { theme } from '../../theme';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const StyledButton = styled.button<{
  variant: ButtonProps['variant'];
  size: ButtonProps['size'];
  fullWidth: boolean;
  hasLeftIcon: boolean;
  hasRightIcon: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing[2]};
  border: none;
  border-radius: ${theme.borderRadius.lg};
  font-family: ${theme.typography.fontFamily.sans.join(', ')};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: ${theme.transitions.normal};
  position: relative;
  overflow: hidden;
  
  ${({ fullWidth }) => fullWidth && 'width: 100%;'}
  
  ${({ size }) => {
    switch (size) {
      case 'sm':
        return `
          padding: ${theme.spacing[2]} ${theme.spacing[3]};
          font-size: ${theme.typography.fontSize.sm};
          height: 32px;
        `;
      case 'md':
        return `
          padding: ${theme.spacing[3]} ${theme.spacing[4]};
          font-size: ${theme.typography.fontSize.base};
          height: 40px;
        `;
      case 'lg':
        return `
          padding: ${theme.spacing[4]} ${theme.spacing[6]};
          font-size: ${theme.typography.fontSize.lg};
          height: 48px;
        `;
      case 'xl':
        return `
          padding: ${theme.spacing[5]} ${theme.spacing[8]};
          font-size: ${theme.typography.fontSize.xl};
          height: 56px;
        `;
      default:
        return `
          padding: ${theme.spacing[3]} ${theme.spacing[4]};
          font-size: ${theme.typography.fontSize.base};
          height: 40px;
        `;
    }
  }}
  
  ${({ variant }) => {
    switch (variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%);
          color: ${theme.colors.text.inverse};
          box-shadow: ${theme.shadows.md};
          
          &:hover:not(:disabled) {
            background: linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[700]} 100%);
            box-shadow: ${theme.shadows.lg};
            transform: translateY(-1px);
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: ${theme.shadows.sm};
          }
        `;
      case 'secondary':
        return `
          background: ${theme.colors.background.elevated};
          color: ${theme.colors.text.primary};
          border: 1px solid ${theme.colors.border.primary};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.neutral[700]};
            border-color: ${theme.colors.border.secondary};
          }
        `;
      case 'outline':
        return `
          background: transparent;
          color: ${theme.colors.primary[500]};
          border: 1px solid ${theme.colors.primary[500]};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.primary[500]};
            color: ${theme.colors.text.inverse};
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${theme.colors.text.secondary};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.background.elevated};
            color: ${theme.colors.text.primary};
          }
        `;
      case 'danger':
        return `
          background: linear-gradient(135deg, ${theme.colors.status.error} 0%, #dc2626 100%);
          color: ${theme.colors.text.inverse};
          
          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            transform: translateY(-1px);
          }
        `;
      default:
        return `
          background: ${theme.colors.background.elevated};
          color: ${theme.colors.text.primary};
          border: 1px solid ${theme.colors.border.primary};
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
  
  &:focus-visible {
    outline: 2px solid ${theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onClick,
  type = 'button',
  className,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      hasLeftIcon={!!leftIcon}
      hasRightIcon={!!rightIcon}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      className={className}
      {...props}
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </StyledButton>
  );
};

export default Button;
