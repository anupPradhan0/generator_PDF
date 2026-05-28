import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightAdornment?: ReactNode;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, rightAdornment, className = '', ...props }, ref) => (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          className={`w-full rounded-lg border px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${rightAdornment ? 'pr-11' : ''} ${className}`}
          {...props}
        />
        {rightAdornment ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">{rightAdornment}</div>
        ) : null}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
);

InputField.displayName = 'InputField';
