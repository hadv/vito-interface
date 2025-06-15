import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

const getBadgeClasses = (
  variant: BadgeProps['variant'] = 'default',
  size: BadgeProps['size'] = 'md',
  dot: boolean = false
) => {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-semibold rounded-full whitespace-nowrap'
  ];

  // Size classes with improved readability
  const sizeClasses = dot
    ? 'w-2 h-2 p-0'
    : {
        sm: 'px-2 py-1 text-xs h-5',
        md: 'px-3 py-1 text-sm h-6',
        lg: 'px-4 py-2 text-base h-8'
      }[size];

  // Variant classes with blue as primary theme
  const variantClasses = {
    primary: 'bg-blue-500 text-white shadow-lg shadow-blue-500/25',
    secondary: 'bg-green-500 text-white shadow-lg shadow-green-500/25',
    success: 'bg-green-500 text-white shadow-lg shadow-green-500/25',
    warning: 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/25',
    error: 'bg-red-500 text-white shadow-lg shadow-red-500/25',
    info: 'bg-blue-400 text-white shadow-lg shadow-blue-400/25',
    default: 'bg-gray-800 text-gray-300 border border-gray-600'
  };

  return cn(
    baseClasses,
    sizeClasses,
    variantClasses[variant]
  );
};

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  ...props
}) => {
  const badgeClasses = getBadgeClasses(variant, size, dot);

  return (
    <span
      className={cn(badgeClasses, className)}
      {...props}
    >
      {!dot && children}
    </span>
  );
};

export default Badge;
