import React from 'react';
import styled from 'styled-components';
import { theme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const StyledCard = styled.div<{
  variant: CardProps['variant'];
  padding: CardProps['padding'];
  clickable: boolean;
  hover: boolean;
}>`
  border-radius: ${theme.borderRadius.xl};
  transition: ${theme.transitions.normal};
  position: relative;
  overflow: hidden;
  
  ${({ variant }) => {
    switch (variant) {
      case 'elevated':
        return `
          background: ${theme.colors.background.elevated};
          box-shadow: ${theme.shadows.lg};
          border: 1px solid ${theme.colors.border.tertiary};
        `;
      case 'outlined':
        return `
          background: transparent;
          border: 1px solid ${theme.colors.border.primary};
        `;
      case 'glass':
        return `
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        `;
      default:
        return `
          background: ${theme.colors.background.card};
          border: 1px solid ${theme.colors.border.tertiary};
        `;
    }
  }}
  
  ${({ padding }) => {
    switch (padding) {
      case 'none':
        return 'padding: 0;';
      case 'sm':
        return `padding: ${theme.spacing[3]};`;
      case 'md':
        return `padding: ${theme.spacing[4]};`;
      case 'lg':
        return `padding: ${theme.spacing[6]};`;
      case 'xl':
        return `padding: ${theme.spacing[8]};`;
      default:
        return `padding: ${theme.spacing[4]};`;
    }
  }}
  
  ${({ clickable, hover }) => clickable && `
    cursor: pointer;
    
    ${hover && `
      &:hover {
        transform: translateY(-2px);
        box-shadow: ${theme.shadows.xl};
        border-color: ${theme.colors.border.secondary};
      }
    `}
  `}
`;

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
  onClick,
  hover = true,
  ...props
}) => {
  return (
    <StyledCard
      variant={variant}
      padding={padding}
      clickable={!!onClick}
      hover={hover}
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

export default Card;
