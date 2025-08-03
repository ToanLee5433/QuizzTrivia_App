import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  variant = 'default',
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'w-full transition-colors duration-200 focus:outline-none';
  
  const variantClasses = {
    default: `
      px-3 py-2 border rounded-lg
      ${error 
        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
      }
      focus:ring-2 focus:ring-opacity-50
    `,
    filled: `
      px-3 py-2 bg-gray-100 rounded-lg border-2 border-transparent
      ${error 
        ? 'bg-red-50 focus:border-red-500' 
        : 'focus:border-blue-500'
      }
    `,
    outlined: `
      px-3 py-2 border-2 rounded-lg bg-transparent
      ${error 
        ? 'border-red-500 focus:border-red-600' 
        : 'border-gray-300 focus:border-blue-500'
      }
    `,
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500">{icon}</span>
          </div>
        )}
        
        <input
          ref={ref}
          className={`
            ${baseClasses}
            ${variantClasses[variant]}
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
