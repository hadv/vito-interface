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

  // VIBRANT CREATIVE BUTTONS
  const variantClasses = {
    primary: [
      'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white',
      'hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600',
      'shadow-lg hover:shadow-2xl',
      'hover:shadow-pink-500/30',
      'border-2 border-transparent',
      'bg-size-200 hover:bg-pos-100',
      'relative overflow-hidden'
    ],
    secondary: [
      'bg-gradient-to-r from-teal-400 to-blue-500 text-white',
      'hover:from-teal-500 hover:to-blue-600',
      'shadow-lg hover:shadow-2xl',
      'hover:shadow-teal-400/30',
      'border-2 border-transparent'
    ],
    outline: [
      'bg-transparent text-teal-400 border-2 border-teal-400',
      'hover:bg-gradient-to-r hover:from-teal-400 hover:to-blue-500 hover:text-white',
      'hover:shadow-lg hover:shadow-teal-400/25',
      'hover:border-transparent'
    ],
    ghost: [
      'bg-white/5 text-white backdrop-blur-md',
      'hover:bg-gradient-to-r hover:from-white/10 hover:to-white/20',
      'border border-white/20',
      'hover:shadow-lg hover:shadow-white/10'
    ],
    danger: [
      'bg-gradient-to-r from-red-400 via-pink-500 to-red-500 text-white',
      'hover:from-red-500 hover:via-pink-600 hover:to-red-600',
      'shadow-lg hover:shadow-2xl',
      'hover:shadow-red-500/30',
      'border-2 border-transparent'
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
