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
  padding: ${theme.spacing[4]} ${theme.spacing[5]};
  margin: ${theme.spacing[1]} ${theme.spacing[4]};
  cursor: pointer;
  user-select: none;
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${props => props.active ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.medium};
  color: ${props => props.active ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${props => props.active ?
    `${theme.colors.primary[500]}15` :
    'transparent'};
  border: 1px solid ${props => props.active ? theme.colors.primary[500] + '40' : 'transparent'};
  border-radius: ${theme.borderRadius.xl};
  transition: ${theme.transitions.normal};
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: ${props => props.active ?
      theme.colors.primary[500] :
      'transparent'};
    border-radius: 0 2px 2px 0;
    transition: ${theme.transitions.normal};
  }

  &:hover {
    background: ${props => props.active ?
      `${theme.colors.primary[500]}25` :
      `rgba(255, 255, 255, 0.05)`};
    color: ${theme.colors.text.primary};
    transform: translateX(2px);
    border-color: ${props => props.active ? theme.colors.primary[500] + '60' : theme.colors.border.tertiary};
  }
`;

const IconWrapper = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: ${props => props.active ? theme.colors.primary[400] : 'inherit'};
  transition: ${theme.transitions.normal};
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