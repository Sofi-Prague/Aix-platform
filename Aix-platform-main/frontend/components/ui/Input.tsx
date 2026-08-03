import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({
  label,
  error,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="aix-field">
      <label htmlFor={inputId} className="aix-label">
        {label}
      </label>

      <input
        {...props}
        id={inputId}
        className="aix-input"
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${inputId}-error` : undefined
        }
      />

      {error && (
        <p
          id={`${inputId}-error`}
          className="aix-field-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}