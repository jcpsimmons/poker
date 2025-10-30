import { type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { TEXT_XS_MONO } from "../../lib/classNames";

interface BadgeProps {
  variant?: "success" | "info" | "primary" | "secondary" | "active" | "task" | "hostile";
  children: ReactNode;
  className?: string;
}

export const Badge = ({ variant = "secondary", children, className }: BadgeProps) => {
  const variantClasses = {
    success: "bg-green-500/10 border border-green-500/20 text-green-500",
    info: "bg-primary/10 border border-primary/50 text-primary",
    primary: "bg-foreground text-background border border-foreground",
    secondary: "bg-muted text-foreground border border-border",
    // Tactical variants
    active: "bg-accent/10 border border-accent/30 text-accent",
    task: "bg-primary/10 border border-primary/30 text-primary",
    hostile: "bg-destructive/10 border border-destructive/30 text-destructive",
  };

  return (
    <span
      className={cn(
        variantClasses[variant],
        TEXT_XS_MONO,
        "px-1.5 py-0.5 rounded inline-block uppercase font-medium",
        className
      )}
    >
      {children}
    </span>
  );
};

