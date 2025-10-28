import { usePoker } from "../contexts/PokerContext";
import { ExternalLink } from "lucide-react";

export const IssueCard = () => {
  const { gameState } = usePoker();

  return (
    <div className="border border-border/50 rounded p-2 bg-card">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-sm font-medium font-mono">
          {gameState.currentIssue}
        </h2>
        {gameState.linearIssue && (
          <a
            href={gameState.linearIssue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};
