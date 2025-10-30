import { usePoker } from "../contexts/PokerContext";
import { cn } from "../lib/utils";
import { Panel } from "./layout/Panel";
import { Badge } from "./ui/Badge";

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
      <Panel 
        title="VOTES" 
        className="w-full md:w-80 min-h-[400px] flex flex-col"
        contentClassName="flex flex-col flex-1"
      >
        <div className="text-muted-foreground text-xs font-mono text-center flex-1 flex items-center justify-center">
          Waiting for votes...
        </div>
      </Panel>
    );
  }

  return (
    <Panel 
      title="VOTES" 
      className="w-full md:w-80 flex flex-col"
      contentClassName="flex flex-col flex-1"
    >
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {gameState.votes.map((vote, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 p-1.5 rounded text-xs transition-colors",
              gameState.revealed && "bg-muted"
            )}
            data-testid="vote-row"
          >
            <div className="w-28 font-mono text-foreground truncate" data-testid="vote-username">
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
                <span className="text-primary text-xs">●</span>
                <span className="text-muted-foreground text-xs font-mono">VOTED</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {gameState.revealed && gameState.averagePoints !== "0" && (
        <div className="mt-2 p-2">
          <Badge variant="success" className="w-full text-center block">
            AVG: {gameState.averagePoints}
          </Badge>
        </div>
      )}
    </Panel>
  );
};
