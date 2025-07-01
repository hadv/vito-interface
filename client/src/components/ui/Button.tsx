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
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  allowClickWhenDisabled?: boolean; // Allow clicks even when disabled (for wallet connection)
}

const getButtonClasses = (
  variant: ButtonProps['variant'] = 'secondary',
  size: ButtonProps['size'] = 'md',
  fullWidth: boolean = false,
  disabled: boolean = false,
  loading: boolean = false,
  allowClickWhenDisabled: boolean = false
) => {
  const baseClasses = [
    'inline-flex items-center justify-center gap-2',
    'border rounded-lg font-semibold cursor-pointer',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-2 focus-visible:outline-blue-400 focus-visible:outline-offset-2',
    fullWidth && 'w-full',
    (disabled || loading) && !allowClickWhenDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    (disabled || loading) && allowClickWhenDisabled && 'cursor-pointer'
  ];

  // Clean, proportional sizes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm h-8',
    md: 'px-4 py-2.5 text-base h-10',
    lg: 'px-6 py-3 text-lg h-12',
    xl: 'px-8 py-4 text-xl h-14'
  };

  // DARK THEME HIGH CONTRAST BUTTONS
  const variantClasses = {
    primary: [
      'bg-blue-600 text-white border-blue-600',
      'hover:bg-blue-700 hover:border-blue-700',
      'active:bg-blue-800',
      'shadow-lg hover:shadow-xl'
    ],
    secondary: [
      'bg-slate-700 text-white border-slate-600',
      'hover:bg-slate-600 hover:border-slate-500',
      'active:bg-slate-800',
      'shadow-lg hover:shadow-xl'
    ],
    outline: [
      'bg-transparent text-blue-400 border-blue-500',
      'hover:bg-blue-600 hover:text-white hover:border-blue-600',
      'active:bg-blue-700'
    ],
    ghost: [
      'bg-transparent text-white border-transparent',
      'hover:bg-slate-700 hover:text-white',
      'active:bg-slate-800'
    ],
    danger: [
      'bg-red-600 text-white border-red-600',
      'hover:bg-red-700 hover:border-red-700',
      'active:bg-red-800',
      'shadow-lg hover:shadow-xl'
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
  allowClickWhenDisabled = false,
  ...props
}) => {
  const buttonClasses = getButtonClasses(variant, size, fullWidth, disabled, loading, allowClickWhenDisabled);

  return (
    <button
      className={cn(buttonClasses, className)}
      disabled={allowClickWhenDisabled ? false : (disabled || loading)}
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
