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
    'border-0 rounded-xl font-semibold cursor-pointer',
    'transition-all duration-300 ease-out',
    'relative overflow-hidden',
    'tracking-tight',
    'focus-visible:outline-2 focus-visible:outline-blue-400 focus-visible:outline-offset-2',
    'hover:scale-[1.02] active:scale-[0.98]',
    fullWidth && 'w-full',
    (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none scale-100'
  ];

  // Premium size classes with elegant proportions
  const sizeClasses = {
    sm: 'px-4 py-2.5 text-sm h-9',
    md: 'px-6 py-3 text-base h-11',
    lg: 'px-8 py-4 text-lg h-13',
    xl: 'px-10 py-5 text-xl h-15'
  };

  // Premium variant classes with sophisticated styling
  const variantClasses = {
    primary: [
      'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
      'hover:from-blue-600 hover:to-blue-700',
      'shadow-lg hover:shadow-xl',
      'border border-blue-400/20'
    ],
    secondary: [
      'bg-white/5 text-white border border-white/10',
      'hover:bg-white/10 hover:border-white/20',
      'backdrop-blur-sm'
    ],
    outline: [
      'bg-transparent text-blue-400 border border-blue-400/50',
      'hover:bg-blue-400/10 hover:border-blue-400',
      'hover:text-blue-300'
    ],
    ghost: [
      'bg-transparent text-gray-300',
      'hover:bg-white/5 hover:text-white'
    ],
    danger: [
      'bg-gradient-to-r from-red-500 to-red-600 text-white',
      'hover:from-red-600 hover:to-red-700',
      'shadow-lg hover:shadow-xl',
      'border border-red-400/20'
    ],
    success: [
      'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
      'hover:from-emerald-600 hover:to-emerald-700',
      'shadow-lg hover:shadow-xl',
      'border border-emerald-400/20'
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
