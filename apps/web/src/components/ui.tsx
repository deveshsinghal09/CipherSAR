import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { LoaderCircle } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  leadingIcon,
  trailingIcon,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "button--primary"
      : variant === "danger"
        ? "button--danger"
        : variant === "ghost"
          ? "button--ghost"
          : "button--quiet";
  return (
    <button
      {...props}
      type={type}
      className={`button ui-button ui-button--${size} ${variantClass} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <LoaderCircle className="spin" size={16} /> : leadingIcon}
      <span>{children}</span>
      {!loading ? trailingIcon : null}
    </button>
  );
}

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "aside" | "div" | "section";
  children: ReactNode;
}

export function Card({
  as: Element = "section",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <Element className={`panel ui-card ${className}`.trim()} {...props}>
      {children}
    </Element>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  detail,
  action,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state ui-empty-state" role="status">
      <div className="ui-empty-state__icon">
        <Icon size={24} />
      </div>
      <strong>{title}</strong>
      <span>{detail}</span>
      {action ? <div className="ui-empty-state__action">{action}</div> : null}
    </div>
  );
}

export function Skeleton({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`ui-skeleton ${className}`.trim()}
      aria-hidden="true"
      {...props}
    />
  );
}
