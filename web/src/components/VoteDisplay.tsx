import { usePoker } from "../contexts/PokerContext";
import { cn } from "../lib/utils";

export const VoteDisplay = () => {
  const { gameState } = usePoker();

  const getVoteBar = (points: string) => {
    const pointsMap: Record<string, number> = {
      "1": 1,
      "2": 2,
      "3": 3,
      "5": 5,
      "8": 8,
      "13": 10,
    };
    const barLength = pointsMap[points] || 1;
    return "█".repeat(barLength);
  };

  if (gameState.votes.length === 0) {
    return (
      <div className="border border-border/50 rounded p-3 bg-card">
        <h3 className="text-foreground text-xs font-medium uppercase tracking-wider mb-2">
          Votes
        </h3>
        <div className="text-muted-foreground text-xs font-mono text-center py-4">
          Waiting for votes...
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border/50 rounded p-3 bg-card">
      <h3 className="text-foreground text-xs font-medium uppercase tracking-wider mb-2">
        Votes
      </h3>

      <div className="space-y-1.5">
        {gameState.votes.map((vote, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 p-1.5 rounded text-xs transition-colors",
              gameState.revealed && "bg-muted"
            )}
          >
            <div className="w-28 font-mono text-foreground truncate">
              {vote.username}
            </div>
            {gameState.revealed ? (
              <>
                <div className="flex-1">
                  <div className="text-green-500 font-mono text-xs">
                    {getVoteBar(vote.points)}
                  </div>
                </div>
                <div className="text-foreground font-mono w-8 text-right">
                  {vote.points === "0" ? "NV" : vote.points}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center gap-1.5">
                <span className="text-primary text-xs animate-pulse">◆</span>
                <span className="text-muted-foreground text-xs font-mono">VOTED</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {gameState.revealed && gameState.averagePoints !== "0" && (
        <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded">
          <div className="text-green-500 text-xs font-mono">
            AVG: {gameState.averagePoints}
          </div>
        </div>
      )}
    </div>
  );
};
