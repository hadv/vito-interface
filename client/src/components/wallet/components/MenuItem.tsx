import React from 'react';
import styled from 'styled-components';
// import { theme } from '../../../theme'; // Reserved for future theme integration

interface MenuItemProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const StyledMenuItem = styled.div<{ active: boolean }>`
  padding: 18px 24px;
  margin: 6px 16px;
  cursor: pointer;
  user-select: none;
  font-size: 18px;
  font-weight: ${props => props.active ? '700' : '600'};
  color: ${props => props.active ? '#ffffff' : '#ffffff'};
  background: ${props => props.active ? '#3b82f6' : 'transparent'};
  border: 1px solid ${props => props.active ? '#3b82f6' : 'transparent'};
  border-radius: 12px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap:16px;
  min-height: 56px;

  &:hover {
    background: ${props => props.active ? '#2563eb' : '#334155'};
    color: #ffffff;
    border-color: ${props => props.active ? '#2563eb' : '#475569'};
  }

  &:active {
    background: ${props => props.active ? '#1d4ed8' : '#475569'};
  }
`;

const IconWrapper = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${props => props.active ? '#ffffff' : '#ffffff'};
  transition: all 0.2s ease;
  font-size: 24px;
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