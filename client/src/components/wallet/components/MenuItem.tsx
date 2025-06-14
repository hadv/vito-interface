import React from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';

interface MenuItemProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const StyledMenuItem = styled.div<{ active: boolean }>`
  padding: 24px 28px;
  margin: 12px 20px;
  cursor: pointer;
  user-select: none;
  font-size: 20px;
  font-weight: 600;
  color: #FFFFFF;
  background: ${props => props.active ?
    'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)' :
    'rgba(0, 0, 0, 0.4)'};
  border: 2px solid transparent;
  border-radius: 20px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  min-height: 70px;
  backdrop-filter: blur(20px);
  overflow: hidden;

  ${props => props.active && `
    background-size: 200% 200%;
    animation: gradientMove 3s ease infinite;
    box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
  `}

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 2px;
    background: ${props => props.active ?
      'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4)' :
      'linear-gradient(45deg, transparent, transparent)'};
    border-radius: inherit;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    ${props => props.active && 'animation: borderRotate 4s linear infinite;'}
  }

  &:hover {
    transform: translateX(8px) translateY(-2px) scale(1.02);
    background: ${props => props.active ?
      'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)' :
      'linear-gradient(135deg, rgba(78, 205, 196, 0.2) 0%, rgba(69, 183, 209, 0.2) 100%)'};
    box-shadow: 0 12px 40px rgba(78, 205, 196, 0.4);
    border-color: #4ECDC4;
  }

  &:active {
    transform: translateX(6px) translateY(-1px) scale(1.01);
  }

  @keyframes gradientMove {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  @keyframes borderRotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const IconWrapper = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #FFFFFF;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  font-size: 24px;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));

  ${props => props.active && `
    animation: iconPulse 2s ease-in-out infinite;
  `}

  @keyframes iconPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`;

const MenuItem: React.FC<MenuItemProps> = ({ active, onClick, children, icon }) => {
  return (
    <StyledMenuItem active={active} onClick={onClick}>
      {icon && <IconWrapper active={active}>{icon}</IconWrapper>}
      {children}
    </StyledMenuItem>
  );
};

export default MenuItem; 