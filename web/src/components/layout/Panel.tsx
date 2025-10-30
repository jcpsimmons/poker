import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface PanelProps {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "hostile" | "task" | "active";
  count?: number;
  collapsible?: boolean;
}

export const Panel = ({ 
  title, 
  children, 
  className, 
  contentClassName,
  variant = "default",
  count
}: PanelProps) => {
  const variantClasses = {
    default: "border-border",
    hostile: "border-destructive/30",
    task: "border-primary/30",
    active: "border-accent/30"
  };
  
  const titleVariantClasses = {
    default: "bg-muted",
    hostile: "bg-destructive/10",
    task: "bg-primary/10",
    active: "bg-accent/10"
  };
  
  const countVariantClasses = {
    default: "text-muted-foreground",
    hostile: "text-destructive",
    task: "text-primary",
    active: "text-accent"
  };
  
  return (
    <div className={cn(
      "border rounded overflow-hidden",
      variantClasses[variant],
      className
    )}>
      {/* Titlebar */}
      <div className={cn(
        "border-b border-border px-3 py-1",
        titleVariantClasses[variant]
      )}>
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-xs font-medium uppercase tracking-wider font-mono">
            {title}
          </h3>
          {count !== undefined && (
            <span className={cn(
              "text-xs font-mono font-bold",
              countVariantClasses[variant]
            )}>
              {count}
            </span>
          )}
        </div>
      </div>
      
      {/* Content - solid background */}
      <div className={cn("p-3 bg-card", contentClassName)}>
        {children}
      </div>
    </div>
  );
};

