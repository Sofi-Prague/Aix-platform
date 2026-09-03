import type {
  InputHTMLAttributes,
} from "react";

type InputProps =
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    hint?: string;
  };

export function Input({
  label,
  error,
  hint,
  id,
  ...props
}: InputProps) {
  const inputId =
    id ??
    props.name ??
    `aix-input-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`;

  const descriptionId = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className="aix-field">
      <label
        htmlFor={inputId}
        className="aix-label"
      >
        {label}
      </label>

      <input
        {...props}
        id={inputId}
        className="aix-input"
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
      />

      {!error && hint && (
        <p
          id={`${inputId}-hint`}
          className="aix-field-hint"
        >
          {hint}
        </p>
      )}

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