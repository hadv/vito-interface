import React, { forwardRef } from 'react';
import styled from 'styled-components';
import { theme } from '../../theme';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  inputSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const InputContainer = styled.div<{ fullWidth: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[1]};
  ${({ fullWidth }) => fullWidth && 'width: 100%;'}
`;

const Label = styled.label`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.secondary};
`;

const InputWrapper = styled.div<{
  variant: InputProps['variant'];
  inputSize: InputProps['inputSize'];
  hasError: boolean;
  hasLeftIcon: boolean;
  hasRightIcon: boolean;
}>`
  position: relative;
  display: flex;
  align-items: center;
  
  ${({ variant, hasError }) => {
    switch (variant) {
      case 'filled':
        return `
          background: ${theme.colors.background.elevated};
          border: 1px solid transparent;
          border-radius: ${theme.borderRadius.lg};
          
          &:focus-within {
            border-color: ${hasError ? theme.colors.status.error : theme.colors.primary[500]};
            box-shadow: 0 0 0 3px ${hasError ? 
              `rgba(239, 68, 68, 0.1)` : 
              `rgba(34, 197, 94, 0.1)`};
          }
        `;
      case 'outlined':
        return `
          background: transparent;
          border: 1px solid ${hasError ? theme.colors.status.error : theme.colors.border.primary};
          border-radius: ${theme.borderRadius.lg};
          
          &:focus-within {
            border-color: ${hasError ? theme.colors.status.error : theme.colors.primary[500]};
            box-shadow: 0 0 0 3px ${hasError ? 
              `rgba(239, 68, 68, 0.1)` : 
              `rgba(34, 197, 94, 0.1)`};
          }
        `;
      default:
        return `
          background: ${theme.colors.background.card};
          border: 1px solid ${hasError ? theme.colors.status.error : theme.colors.border.primary};
          border-radius: ${theme.borderRadius.lg};
          
          &:focus-within {
            border-color: ${hasError ? theme.colors.status.error : theme.colors.primary[500]};
            background: ${theme.colors.background.elevated};
          }
        `;
    }
  }}
  
  ${({ inputSize, hasLeftIcon, hasRightIcon }) => {
    const iconPadding = theme.spacing[10]; // 40px for icon space

    switch (inputSize) {
      case 'sm':
        return `
          height: 36px;
          padding: 0 ${hasRightIcon ? iconPadding : theme.spacing[3]} 0 ${hasLeftIcon ? iconPadding : theme.spacing[3]};
        `;
      case 'lg':
        return `
          height: 52px;
          padding: 0 ${hasRightIcon ? iconPadding : theme.spacing[4]} 0 ${hasLeftIcon ? iconPadding : theme.spacing[4]};
        `;
      default:
        return `
          height: 44px;
          padding: 0 ${hasRightIcon ? iconPadding : theme.spacing[4]} 0 ${hasLeftIcon ? iconPadding : theme.spacing[4]};
        `;
    }
  }}
  
  transition: ${theme.transitions.normal};
`;

const StyledInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize.base};
  font-family: ${theme.typography.fontFamily.sans.join(', ')};
  
  &::placeholder {
    color: ${theme.colors.text.muted};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const IconContainer = styled.div<{ position: 'left' | 'right' }>`
  position: absolute;
  ${({ position }) => position}: ${theme.spacing[3]};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.text.tertiary};
  pointer-events: none;
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const HelperText = styled.div<{ isError: boolean }>`
  font-size: ${theme.typography.fontSize.xs};
  color: ${({ isError }) => isError ? theme.colors.status.error : theme.colors.text.muted};
  margin-top: ${theme.spacing[1]};
`;

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  inputSize = 'md',
  fullWidth = false,
  className,
  ...props
}, ref) => {
  const hasError = !!error;
  
  return (
    <InputContainer fullWidth={fullWidth} className={className}>
      {label && <Label>{label}</Label>}
      
      <InputWrapper
        variant={variant}
        inputSize={inputSize}
        hasError={hasError}
        hasLeftIcon={!!leftIcon}
        hasRightIcon={!!rightIcon}
      >
        {leftIcon && (
          <IconContainer position="left">
            {leftIcon}
          </IconContainer>
        )}
        
        <StyledInput
          ref={ref}
          {...props}
        />
        
        {rightIcon && (
          <IconContainer position="right">
            {rightIcon}
          </IconContainer>
        )}
      </InputWrapper>
      
      {(error || helperText) && (
        <HelperText isError={hasError}>
          {error || helperText}
        </HelperText>
      )}
    </InputContainer>
  );
});

Input.displayName = 'Input';

export default Input;
