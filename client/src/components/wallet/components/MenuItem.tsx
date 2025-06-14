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
  padding: 20px 24px;
  margin: 8px 16px;
  cursor: pointer;
  user-select: none;
  font-size: 18px;
  font-weight: ${props => props.active ? '900' : '700'};
  color: ${props => props.active ? '#FFFFFF' : '#FFFFFF'};
  background: ${props => props.active ? '#3B82F6' : 'transparent'};
  border: 2px solid ${props => props.active ? '#3B82F6' : 'transparent'};
  border-radius: 16px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  min-height: 60px;

  &:hover {
    background: ${props => props.active ? '#2563EB' : '#334155'};
    color: #FFFFFF;
    transform: translateX(4px);
    border-color: ${props => props.active ? '#2563EB' : '#475569'};
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:active {
    transform: translateX(2px);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
  }
`;

const IconWrapper = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: ${props => props.active ? '#FFFFFF' : '#FFFFFF'};
  transition: all 0.2s ease;
  font-size: 20px;
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