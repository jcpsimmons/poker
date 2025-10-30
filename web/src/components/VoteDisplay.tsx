import { usePoker } from "../contexts/PokerContext";
import { cn } from "../lib/utils";
import { Panel } from "./layout/Panel";
import { Lock } from "lucide-react";

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

  const isHost = (username: string) => {
    return username === gameState.username && gameState.isHost;
  };

  if (gameState.votes.length === 0) {
    return (
      <Panel 
        title="VOTES" 
        count={0}
        className="w-full md:w-80 flex flex-col"
        contentClassName="flex flex-col flex-1 p-2"
      >
        <div className="text-muted-foreground text-xs font-mono text-center flex-1 flex items-center justify-center uppercase">
          Waiting for votes...
        </div>
      </Panel>
    );
  }

  return (
    <Panel 
      title="VOTES" 
      count={gameState.votes.length}
      variant={gameState.revealed ? "active" : "default"}
      className="w-full md:w-80 flex flex-col"
      contentClassName="flex flex-col flex-1 p-2"
    >
      <div className="space-y-1 flex-1 overflow-y-auto scrollbar-thin">
        {gameState.votes.map((vote, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 p-2 rounded text-xs transition-colors border",
              gameState.revealed ? "bg-muted/30 border-border" : "bg-transparent border-border/50"
            )}
            data-testid="vote-row"
          >
            <div className="flex items-center gap-1.5 w-32">
              <span className={cn(
                "text-xs",
                isHost(vote.username) ? "text-accent" : "text-muted-foreground"
              )}>●</span>
              <div className="font-mono text-foreground truncate text-xs uppercase" data-testid="vote-username">
                {vote.username}
              </div>
            </div>
            {gameState.revealed ? (
              <>
                <div className="flex-1">
                  <div className="text-accent font-mono text-xs">
                    {getVoteBar(vote.points)}
                  </div>
                </div>
                <div className="text-foreground font-mono w-8 text-right font-bold">
                  {vote.points === "0" ? "NV" : vote.points}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground text-[10px] font-mono uppercase">Classified</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {gameState.revealed && gameState.averagePoints !== "0" && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs font-mono uppercase">
            <span className="text-muted-foreground">Average</span>
            <span className="text-accent font-bold text-lg">{gameState.averagePoints}</span>
          </div>
        </div>
      )}
    </Panel>
  );
};
