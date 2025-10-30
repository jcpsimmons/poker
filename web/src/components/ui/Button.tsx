import { type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { 
  BUTTON_BASE, 
  BUTTON_PRIMARY, 
  BUTTON_SECONDARY,
  BUTTON_TACTICAL_PRIMARY,
  BUTTON_TACTICAL_ACTIVE,
  BUTTON_TACTICAL_HOSTILE,
  BUTTON_TACTICAL_TOGGLE
} from "../../lib/classNames";
import type { LucideIcon } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "base" | "tactical-primary" | "tactical-active" | "tactical-hostile" | "tactical-toggle";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  children: ReactNode;
}

export const Button = ({
  variant = "base",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  className,
  children,
  disabled,
  ...props
}: ButtonProps) => {
  const baseClass = cn(
    variant === "primary" && BUTTON_PRIMARY,
    variant === "secondary" && BUTTON_SECONDARY,
    variant === "base" && BUTTON_BASE,
    variant === "tactical-primary" && BUTTON_TACTICAL_PRIMARY,
    variant === "tactical-active" && BUTTON_TACTICAL_ACTIVE,
    variant === "tactical-hostile" && BUTTON_TACTICAL_HOSTILE,
    variant === "tactical-toggle" && BUTTON_TACTICAL_TOGGLE,
    size === "sm" && "text-[10px] py-1 px-2",
    size === "md" && "text-xs py-2 px-3",
    size === "lg" && "text-sm py-3 px-4",
    Icon && "flex items-center justify-center gap-1.5",
    className
  );

  const iconElement = Icon ? <Icon className="w-3 h-3" /> : null;

  return (
    <button className={baseClass} disabled={disabled} {...props}>
      {Icon && iconPosition === "left" && iconElement}
      {children}
      {Icon && iconPosition === "right" && iconElement}
    </button>
  );
};

