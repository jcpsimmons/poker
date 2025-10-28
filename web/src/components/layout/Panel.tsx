import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface PanelProps {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export const Panel = ({ title, children, className, contentClassName }: PanelProps) => {
  return (
    <div className={cn("border border-border/50 rounded overflow-hidden bg-card", className)}>
      {/* Titlebar */}
      <div className="bg-muted border-b border-border/50 px-3 py-1">
        <h3 className="text-foreground text-xs font-medium uppercase tracking-wider font-mono">
          {title}
        </h3>
      </div>
      
      {/* Content */}
      <div className={cn("p-3", contentClassName)}>
        {children}
      </div>
    </div>
  );
};

