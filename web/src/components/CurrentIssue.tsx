import { usePoker } from "../contexts/PokerContext";
import { Panel } from "./layout/Panel";
import { Badge } from "./ui/Badge";
import { ExternalLink } from "lucide-react";

export const CurrentIssue = () => {
  const { gameState } = usePoker();
  const { currentIssue, linearIssue } = gameState;

  return (
    <Panel title="CURRENT ISSUE" variant="task" className="flex-1 h-full" contentClassName="p-3">
      <div className="flex flex-col gap-2">
        {linearIssue && (
          <div className="flex items-center justify-between">
            <Badge variant="task">{linearIssue.identifier}</Badge>
            <a
              href={linearIssue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono text-primary hover:text-accent transition-colors"
              aria-label="Open issue in Linear"
            >
              <span className="uppercase text-[10px]">View</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        
        <div className="text-sm font-mono text-foreground">
          {linearIssue ? linearIssue.title : currentIssue}
        </div>
        
        {linearIssue?.description && (
          <div className="text-xs font-mono text-muted-foreground line-clamp-3 leading-relaxed">
            {linearIssue.description}
          </div>
        )}
      </div>
    </Panel>
  );
};

