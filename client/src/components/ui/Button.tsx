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
    'inline-flex items-center justify-center gap-3',
    'border-0 rounded-2xl font-black cursor-pointer',
    'transition-all duration-300 ease-out',
    'text-shadow-sm',
    'hover:scale-105 active:scale-95',
    'focus-visible:outline-2 focus-visible:outline-blue-400 focus-visible:outline-offset-2',
    fullWidth && 'w-full',
    (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none scale-100'
  ];

  // Modern, bold sizes with better proportions
  const sizeClasses = {
    sm: 'px-6 py-3 text-base h-12',
    md: 'px-8 py-4 text-lg h-14',
    lg: 'px-10 py-5 text-xl h-16',
    xl: 'px-12 py-6 text-2xl h-18'
  };

  // MODERN ATTRACTIVE BUTTONS
  const variantClasses = {
    primary: [
      'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
      'hover:from-blue-600 hover:to-blue-700',
      'shadow-lg hover:shadow-xl',
      'hover:shadow-blue-500/25',
      'border border-blue-400/30'
    ],
    secondary: [
      'bg-gradient-to-r from-slate-600 to-slate-700 text-white',
      'hover:from-slate-700 hover:to-slate-800',
      'shadow-lg hover:shadow-xl',
      'border border-slate-500/30'
    ],
    outline: [
      'bg-transparent text-blue-400 border-2 border-blue-500',
      'hover:bg-blue-500 hover:text-white',
      'hover:shadow-lg hover:shadow-blue-500/25',
      'active:bg-blue-600'
    ],
    ghost: [
      'bg-white/10 text-white backdrop-blur-sm',
      'hover:bg-white/20',
      'border border-white/20',
      'hover:shadow-lg'
    ],
    danger: [
      'bg-gradient-to-r from-red-500 to-red-600 text-white',
      'hover:from-red-600 hover:to-red-700',
      'shadow-lg hover:shadow-xl',
      'hover:shadow-red-500/25',
      'border border-red-400/30'
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
