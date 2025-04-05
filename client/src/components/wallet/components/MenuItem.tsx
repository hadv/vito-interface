import React from 'react';
import styled from 'styled-components';

interface MenuItemProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const StyledMenuItem = styled.div<{ active: boolean }>`
  padding: 12px 16px;
  margin: 2px 0;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  font-weight: ${props => props.active ? '600' : '500'};
  color: ${props => props.active ? '#fff' : '#9ca3af'};
  background-color: ${props => props.active ? '#373737' : 'transparent'};
  border-radius: 6px;
  margin-left: 8px;
  margin-right: 8px;
  transition: background-color 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  
  &:hover {
    background-color: ${props => props.active ? '#373737' : '#303030'};
    color: #fff;
  }
`;

const IconWrapper = styled.div`
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MenuItem: React.FC<MenuItemProps> = ({ active, onClick, children, icon }) => {
  return (
    <StyledMenuItem active={active} onClick={onClick}>
      {icon && <IconWrapper>{icon}</IconWrapper>}
      {children}
    </StyledMenuItem>
  );
};

export default MenuItem; 