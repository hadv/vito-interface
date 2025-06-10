import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const getCardClasses = (
  variant: CardProps['variant'] = 'default',
  padding: CardProps['padding'] = 'md',
  clickable: boolean = false,
  hover: boolean = true
) => {
  const baseClasses = [
    'rounded-xl transition-all duration-250 ease-in-out',
    'relative overflow-hidden',
    clickable && 'cursor-pointer',
    clickable && hover && 'hover:-translate-y-0.5 hover:shadow-xl hover:border-dark-500'
  ];

  // Variant classes
  const variantClasses = {
    default: 'bg-dark-900 border border-dark-700',
    elevated: 'bg-dark-800 shadow-lg border border-dark-700',
    outlined: 'bg-transparent border border-dark-600',
    glass: 'bg-white/5 backdrop-blur-md border border-white/10'
  };

  // Padding classes
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  return cn(
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding]
  );
};

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
  onClick,
  hover = true,
  ...props
}) => {
  const cardClasses = getCardClasses(variant, padding, !!onClick, hover);

  return (
    <div
      className={cn(cardClasses, className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
