import { type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { TEXT_XS_MONO, BADGE_SUCCESS, BADGE_INFO } from "../../lib/classNames";

interface BadgeProps {
  variant?: "success" | "info" | "primary" | "secondary";
  children: ReactNode;
  className?: string;
}

export const Badge = ({ variant = "secondary", children, className }: BadgeProps) => {
  const variantClasses = {
    success: BADGE_SUCCESS + " text-green-500",
    info: BADGE_INFO + " text-primary",
    primary: "bg-foreground text-background",
    secondary: "bg-muted text-foreground",
  };

  return (
    <span
      className={cn(
        variantClasses[variant],
        TEXT_XS_MONO,
        "px-1.5 py-0.5 rounded inline-block",
        className
      )}
    >
      {children}
    </span>
  );
};

