import { usePoker } from "../contexts/PokerContext";
import { ESTIMATE_OPTIONS } from "../types/poker";
import { cn } from "../lib/utils";
import { Panel } from "./layout/Panel";
import { Badge } from "./ui/Badge";

export const EstimateSelector = () => {
  const { gameState, vote } = usePoker();

  return (
    <Panel 
      title="ESTIMATE" 
      className="w-full md:w-80 min-h-[400px] flex flex-col"
      contentClassName="flex flex-col flex-1"
    >
      <div className="space-y-1.5 flex-1">
        {ESTIMATE_OPTIONS.map((option) => {
          const isSelected = gameState.myVote === option.points;

          return (
            <button
              key={option.points}
              onClick={() => vote(option.points)}
              disabled={gameState.revealed}
              className={cn(
                "w-full text-left p-2.5 rounded border transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 text-sm font-mono",
                isSelected
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent hover:bg-muted border-border/50 text-foreground"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold">{option.points}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </button>
          );
        })}
      </div>

      {gameState.myVote !== undefined && (
        <div className="mt-2 p-2">
          <Badge variant="success" className="w-full text-center block">
            VOTED: {gameState.myVote}
          </Badge>
        </div>
      )}
    </Panel>
  );
};
