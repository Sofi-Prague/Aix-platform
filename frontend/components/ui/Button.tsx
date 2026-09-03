import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "danger";

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    isLoading?: boolean;
    loadingLabel?: string;
  };

export function Button({
  variant = "primary",
  isLoading = false,
  loadingLabel = "Please wait…",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      data-variant={variant}
      data-loading={isLoading}
      aria-busy={isLoading}
      className="aix-button"
    >
      {isLoading ? loadingLabel : children}
    </button>
  );
}