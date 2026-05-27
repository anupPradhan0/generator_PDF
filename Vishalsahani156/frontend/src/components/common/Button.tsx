import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  isLoading?: boolean;
}

const variants = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary:
    'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  outline:
    'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20',
};

export const Button = ({
  children,
  variant = 'primary',
  isLoading,
  className = '',
  disabled,
  ...props
}: ButtonProps) => (
  <button
    className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    disabled={disabled || isLoading}
    {...props}
  >
    {isLoading ? (
      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
    ) : null}
    {children}
  </button>
);
