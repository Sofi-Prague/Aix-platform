import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Card({
  title,
  children,
  className = "",
}: CardProps) {
  return (
    <section className={`aix-card ${className}`}>
      {title && <h2 className="aix-card-title">{title}</h2>}
      {children}
    </section>
  );
}