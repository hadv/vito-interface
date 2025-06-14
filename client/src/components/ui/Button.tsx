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
    'border-0 rounded-lg font-black cursor-pointer',
    'transition-all duration-200',
    'focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2',
    fullWidth && 'w-full',
    (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none'
  ];

  // Bold and readable sizes
  const sizeClasses = {
    sm: 'px-4 py-3 text-sm h-10',
    md: 'px-6 py-4 text-base h-12',
    lg: 'px-8 py-5 text-lg h-14',
    xl: 'px-10 py-6 text-xl h-16'
  };

  // SIMPLE BLUE ONLY - Bold and Clear
  const variantClasses = {
    primary: [
      'bg-blue-600 text-white',
      'hover:bg-blue-700',
      'active:bg-blue-800'
    ],
    secondary: [
      'bg-slate-700 text-white',
      'hover:bg-slate-600',
      'active:bg-slate-800'
    ],
    outline: [
      'bg-transparent text-blue-500 border-2 border-blue-500',
      'hover:bg-blue-500 hover:text-white',
      'active:bg-blue-600'
    ],
    ghost: [
      'bg-transparent text-white',
      'hover:bg-slate-700',
      'active:bg-slate-800'
    ],
    danger: [
      'bg-red-600 text-white',
      'hover:bg-red-700',
      'active:bg-red-800'
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
