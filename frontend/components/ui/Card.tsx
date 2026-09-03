import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  interactive?: boolean;
};

export function Card({
  title,
  subtitle,
  children,
  className = "",
  interactive = false,
}: CardProps) {
  return (
    <section
      className={`aix-card ${className}`.trim()}
      data-interactive={interactive}
    >
      {title && (
        <h2 className="aix-card-title">
          {title}
        </h2>
      )}

      {subtitle && (
        <p className="aix-card-subtitle">
          {subtitle}
        </p>
      )}

      {children}
    </section>
  );
}