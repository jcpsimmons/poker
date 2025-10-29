import { usePoker } from "../contexts/PokerContext";
import { Panel } from "./layout/Panel";
import { ExternalLink } from "lucide-react";

export const CurrentIssue = () => {
  const { gameState } = usePoker();
  const { currentIssue, linearIssue } = gameState;

  return (
    <Panel title="CURRENT ISSUE" className="flex-1 h-full">
      <div className="flex flex-col gap-2">
        {linearIssue && (
          <a
            href={linearIssue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-mono text-primary hover:text-primary/80 transition-colors self-end"
            aria-label="Open issue in Linear"
          >
            <span>{linearIssue.identifier}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        
        <div className="text-xs font-mono">
          {linearIssue ? linearIssue.title : currentIssue}
        </div>
        
        {linearIssue?.description && (
          <div className="text-xs font-mono text-muted-foreground line-clamp-2">
            {linearIssue.description}
          </div>
        )}
      </div>
    </Panel>
  );
};

