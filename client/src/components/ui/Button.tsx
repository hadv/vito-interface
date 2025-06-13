import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const getButtonClasses = (
  variant: ButtonProps['variant'] = 'secondary',
  size: ButtonProps['size'] = 'md',
  fullWidth: boolean = false,
  disabled: boolean = false,
  loading: boolean = false
) => {
  const baseClasses = [
    'inline-flex items-center justify-center gap-2',
    'border-0 rounded-lg font-medium cursor-pointer',
    'transition-all duration-250 ease-in-out',
    'relative overflow-hidden',
    'focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2',
    fullWidth && 'w-full',
    (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none'
  ];

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm h-8',
    md: 'px-4 py-3 text-base h-10',
    lg: 'px-6 py-4 text-lg h-12',
    xl: 'px-8 py-5 text-xl h-14'
  };

  // Variant classes using standard Tailwind colors
  const variantClasses = {
    primary: [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'text-white shadow-md',
      'hover:from-blue-600 hover:to-blue-700',
      'hover:shadow-lg hover:-translate-y-0.5',
      'active:translate-y-0 active:shadow-sm'
    ],
    secondary: [
      'bg-gray-800 text-white border border-gray-600',
      'hover:bg-gray-700 hover:border-gray-500'
    ],
    outline: [
      'bg-transparent text-blue-500 border border-blue-500',
      'hover:bg-blue-500 hover:text-white'
    ],
    ghost: [
      'bg-transparent text-gray-300',
      'hover:bg-gray-800 hover:text-white'
    ],
    danger: [
      'bg-gradient-to-br from-red-500 to-red-600',
      'text-white',
      'hover:from-red-600 hover:to-red-700',
      'hover:-translate-y-0.5'
    ]
  };

  return cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
  );
};

const LoadingSpinner: React.FC = () => (
  <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
);

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onClick,
  type = 'button',
  className,
  ...props
}) => {
  const buttonClasses = getButtonClasses(variant, size, fullWidth, disabled, loading);

  return (
    <button
      className={cn(buttonClasses, className)}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      {...props}
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
};

export default Button;
