import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
};

export function Button({
  variant = "primary",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      data-variant={variant}
      className="aix-button"
    >
      {isLoading ? "Please wait…" : children}
    </button>
  );
}