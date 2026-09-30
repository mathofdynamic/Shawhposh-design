import React from 'react';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  hint,
  error,
  children,
  className = '',
  htmlFor,
}) => {
  return (
    <div className={`space-y-1.5 text-right ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] sm:text-sm font-semibold text-stone-200">
          {label}
          {required && <span className="text-rose-400 mr-1">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-rose-400 font-medium font-sans mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-xs text-stone-400 font-sans mt-1.5 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, leftAddon, rightAddon, className = '', ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {rightAddon && (
          <div className="absolute right-3.5 text-stone-400 pointer-events-none text-xs sm:text-sm shrink-0">
            {rightAddon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full min-h-[42px] bg-[#181716] border rounded-xl py-2 text-[13px] sm:text-sm text-white placeholder:text-stone-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba8d3d]/50 ${
            error
              ? 'border-rose-500/50 focus-visible:ring-rose-500'
              : 'border-white/10 hover:border-white/20 focus-visible:border-[#ba8d3d]'
          } ${rightAddon ? 'pr-10' : 'px-3.5'} ${leftAddon ? 'pl-10' : 'px-3.5'} ${className}`}
          {...props}
        />
        {leftAddon && (
          <div className="absolute left-3.5 text-stone-400 pointer-events-none text-xs sm:text-sm shrink-0">
            {leftAddon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full min-h-[96px] bg-[#181716] border rounded-xl p-3 text-[13px] sm:text-sm text-white placeholder:text-stone-500 transition-colors resize-none leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba8d3d]/50 ${
          error
            ? 'border-rose-500/50 focus-visible:ring-rose-500'
            : 'border-white/10 hover:border-white/20 focus-visible:border-[#ba8d3d]'
        } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, children, className = '', ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={`w-full min-h-[42px] bg-[#181716] border rounded-xl py-2 px-3.5 pl-8 text-[13px] sm:text-sm text-white transition-colors appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba8d3d]/50 ${
            error
              ? 'border-rose-500/50 focus-visible:ring-rose-500'
              : 'border-white/10 hover:border-white/20 focus-visible:border-[#ba8d3d]'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 text-xs">
          ▼
        </div>
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', ...props }, ref) => {
    return (
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          ref={ref}
          type="checkbox"
          className={`w-4 h-4 mt-0.5 rounded bg-white/5 border border-white/20 text-[#ba8d3d] focus:ring-[#ba8d3d] cursor-pointer ${className}`}
          {...props}
        />
        {(label || description) && (
          <div className="text-right">
            {label && <span className="text-[13px] sm:text-sm text-stone-200 font-medium block">{label}</span>}
            {description && <span className="text-xs text-stone-400 block mt-0.5 leading-relaxed">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="text-right">
          {label && <span className="text-[13px] sm:text-sm text-stone-200 font-medium block">{label}</span>}
          {description && <span className="text-xs text-stone-400 block mt-0.5 leading-relaxed">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba8d3d] disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-[#ba8d3d]' : 'bg-white/15'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? '-translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
