import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  inputSize?: 'sm' | 'md' | 'lg' | 'xl';
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

  // Size classes - made bigger and wider
  const sizeClasses = {
    sm: 'h-10',
    md: 'h-12',
    lg: 'h-14',
    xl: 'h-16'
  };

  // MODERN ATTRACTIVE INPUTS
  const variantClasses = {
    default: [
      'bg-white/10 border-white/20 rounded-2xl backdrop-blur-sm',
      'focus-within:border-[#12D66F]',
      'focus-within:shadow-[0_0_0_4px_rgba(18,214,111,0.3)]',
      'hover:border-white/30 hover:bg-white/15',
      'transition-all duration-300 ease-out',
      hasError ? 'border-red-400 focus-within:border-red-400 focus-within:shadow-red-500/20' : ''
    ],
    filled: [
      'bg-white/15 border-transparent rounded-2xl backdrop-blur-sm',
      'focus-within:border-[#12D66F]',
      'focus-within:shadow-[0_0_0_4px_rgba(18,214,111,0.3)]',
      'hover:bg-white/20',
      'transition-all duration-300 ease-out',
      hasError ? 'border-red-400 focus-within:border-red-400 bg-red-500/15' : ''
    ],
    outlined: [
      'bg-transparent border-white/30 rounded-2xl',
      'focus-within:border-[#12D66F]',
      'focus-within:shadow-[0_0_0_4px_rgba(18,214,111,0.3)]',
      'hover:border-white/40',
      'transition-all duration-300 ease-out',
      hasError ? 'border-red-400 focus-within:border-red-400' : ''
    ]
  };

  return cn(
    baseClasses,
    sizeClasses[inputSize],
    variantClasses[variant]
  );
};

const getInputClasses = (inputSize: InputProps['inputSize'] = 'md') => {
  const baseClasses = [
    'flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0',
    'text-white font-medium font-sans',
    'placeholder:text-gray-400 placeholder:font-normal',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ];

  // Size-specific text and padding
  const sizeClasses = {
    sm: 'text-sm px-4 py-2',
    md: 'text-base px-5 py-3',
    lg: 'text-lg px-6 py-4',
    xl: 'text-xl px-7 py-5'
  };

  return cn(baseClasses, sizeClasses[inputSize]);
};

const getIconClasses = (position: 'left' | 'right') => cn(
  'absolute flex items-center justify-center',
  'text-gray-400 pointer-events-none',
  position === 'left' ? 'left-3' : 'right-3',
  '[&>svg]:w-[18px] [&>svg]:h-[18px]'
);

const getHelperTextClasses = (isError: boolean) => cn(
  'text-sm mt-1 font-medium',
  isError ? 'text-red-400' : 'text-gray-400'
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
          className={getInputClasses(inputSize)}
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
