import { usePoker } from "../contexts/PokerContext";
import { ESTIMATE_OPTIONS } from "../types/poker";
import { cn } from "../lib/utils";
import { Panel } from "./layout/Panel";
import { Check } from "lucide-react";

export const EstimateSelector = () => {
  const { gameState, vote } = usePoker();

  return (
    <Panel 
      title="ESTIMATE" 
      className="w-full md:w-80 flex flex-col"
      contentClassName="flex flex-col flex-1 p-2"
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
                "w-full text-left p-2.5 rounded border transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-mono uppercase text-xs",
                isSelected
                  ? "bg-secondary/20 text-secondary border-secondary/50"
                  : "bg-transparent hover:bg-muted border-border text-foreground"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{option.points}</span>
                <span className="text-[10px] text-muted-foreground normal-case">{option.description}</span>
              </div>
            </button>
          );
        })}
      </div>

      {gameState.myVote !== undefined && (
        <div className="mt-2 flex items-center justify-center gap-2 text-accent text-xs font-mono">
          <Check className="w-3 h-3" />
          <span className="font-medium">VOTED: {gameState.myVote}</span>
        </div>
      )}
    </Panel>
  );
};
