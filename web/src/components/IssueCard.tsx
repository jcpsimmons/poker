import { usePoker } from "../contexts/PokerContext";
import { Users, Clock, Dices } from "lucide-react";

export const IssueCard = () => {
  const { gameState } = usePoker();

  return (
    <div className="border border-border/50 rounded p-3 bg-card">
      <div className="space-y-2">
        <div>
          <h2 className="text-foreground text-sm font-medium font-mono">
            {gameState.currentIssue}
          </h2>
        </div>

        <div className="h-px bg-border/50" />

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium text-foreground">{gameState.participants}</span>
            <span className="text-muted-foreground">Participants</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium text-foreground">Avg: {gameState.averagePoints}</span>
            <span className="text-muted-foreground">pts</span>
          </div>
          <div className="flex items-center gap-2">
            <Dices className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium text-foreground">Round {gameState.roundNumber}</span>
          </div>
        </div>

        {gameState.linearIssue && (
          <div className="mt-2">
            <a
              href={gameState.linearIssue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 text-sm flex items-center gap-1"
            >
              View in Linear
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
