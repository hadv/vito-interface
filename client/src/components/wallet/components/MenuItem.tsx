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
  padding: 16px 20px;
  margin: 4px 16px;
  cursor: pointer;
  user-select: none;
  font-size: 16px;
  font-weight: ${props => props.active ? '600' : '500'};
  color: ${props => props.active ? '#2563eb' : '#374151'};
  background: ${props => props.active ? '#eff6ff' : 'transparent'};
  border: 1px solid ${props => props.active ? '#dbeafe' : 'transparent'};
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;

  &:hover {
    background: ${props => props.active ? '#dbeafe' : '#f9fafb'};
    color: ${props => props.active ? '#1d4ed8' : '#111827'};
    border-color: ${props => props.active ? '#bfdbfe' : '#e5e7eb'};
  }

  &:active {
    background: ${props => props.active ? '#bfdbfe' : '#f3f4f6'};
  }
`;

const IconWrapper = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: ${props => props.active ? '#2563eb' : '#6b7280'};
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