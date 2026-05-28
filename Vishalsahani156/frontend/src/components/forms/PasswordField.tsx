import { forwardRef, useState, InputHTMLAttributes } from 'react';
import { InputField } from './InputField';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  error?: string;
  /** Controlled visibility (e.g. shared across password + confirm on register). */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** When false, no eye button (field still follows `visible`). Default true. */
  showToggle?: boolean;
};

const PasswordVisibilityToggle = ({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    className="rounded p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-gray-400 dark:hover:text-gray-200"
    aria-label={visible ? 'Hide password' : 'Show password'}
  >
    {visible ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
  </button>
);

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  (
    { label, error, visible: visibleProp, onVisibleChange, showToggle = true, ...props },
    ref
  ) => {
    const [internalVisible, setInternalVisible] = useState(false);
    const isControlled = visibleProp !== undefined;
    const isVisible = isControlled ? visibleProp : internalVisible;

    const handleToggle = () => {
      const next = !isVisible;
      if (isControlled) {
        onVisibleChange?.(next);
      } else {
        setInternalVisible(next);
      }
    };

    return (
      <InputField
        ref={ref}
        label={label}
        error={error}
        type={isVisible ? 'text' : 'password'}
        rightAdornment={
          showToggle ? (
            <PasswordVisibilityToggle visible={isVisible} onToggle={handleToggle} />
          ) : undefined
        }
        {...props}
      />
    );
  }
);

PasswordField.displayName = 'PasswordField';
