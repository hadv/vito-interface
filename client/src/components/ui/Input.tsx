import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

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

const getInputContainerClasses = (fullWidth: boolean) => cn(
  'flex flex-col gap-1',
  fullWidth && 'w-full'
);

const getLabelClasses = () => 'text-sm font-medium text-gray-300';

const getInputWrapperClasses = (
  variant: InputProps['variant'] = 'default',
  inputSize: InputProps['inputSize'] = 'md',
  hasError: boolean = false,
  hasLeftIcon: boolean = false,
  hasRightIcon: boolean = false
) => {
  const baseClasses = [
    'relative flex items-center transition-all duration-250',
    'rounded-lg border',
    hasLeftIcon && 'pl-10',
    hasRightIcon && 'pr-10'
  ];

  // Size classes
  const sizeClasses = {
    sm: 'h-9',
    md: 'h-11',
    lg: 'h-13'
  };

  // Variant classes using standard Tailwind colors
  const variantClasses = {
    default: [
      'bg-gray-900 border-gray-600',
      'focus-within:border-blue-500 focus-within:bg-gray-800',
      hasError ? 'border-red-500' : 'border-gray-600'
    ],
    filled: [
      'bg-gray-800 border-transparent',
      'focus-within:border-blue-500',
      hasError ? 'border-red-500' : 'border-transparent'
    ],
    outlined: [
      'bg-transparent',
      'focus-within:border-blue-500',
      hasError ? 'border-red-500' : 'border-gray-600'
    ]
  };

  // Focus ring using standard Tailwind colors
  const focusClasses = hasError
    ? 'focus-within:ring-2 focus-within:ring-red-500/20'
    : 'focus-within:ring-2 focus-within:ring-blue-500/20';

  return cn(
    baseClasses,
    sizeClasses[inputSize],
    variantClasses[variant],
    focusClasses
  );
};

const getInputClasses = () => cn(
  'flex-1 bg-transparent border-0 outline-none',
  'text-white text-lg font-semibold font-sans',
  'placeholder:text-gray-300',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'px-4'
);

const getIconClasses = (position: 'left' | 'right') => cn(
  'absolute flex items-center justify-center',
  'text-gray-400 pointer-events-none',
  position === 'left' ? 'left-3' : 'right-3',
  '[&>svg]:w-[18px] [&>svg]:h-[18px]'
);

const getHelperTextClasses = (isError: boolean) => cn(
  'text-base mt-2 font-medium',
  isError ? 'text-red-300' : 'text-gray-200'
);

// Styled components replaced with Tailwind classes above

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
    <div className={cn(getInputContainerClasses(fullWidth), className)}>
      {label && (
        <label className={getLabelClasses()}>
          {label}
        </label>
      )}

      <div className={getInputWrapperClasses(variant, inputSize, hasError, !!leftIcon, !!rightIcon)}>
        {leftIcon && (
          <div className={getIconClasses('left')}>
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          className={getInputClasses()}
          {...props}
        />

        {rightIcon && (
          <div className={getIconClasses('right')}>
            {rightIcon}
          </div>
        )}
      </div>

      {(error || helperText) && (
        <div className={getHelperTextClasses(hasError)}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
