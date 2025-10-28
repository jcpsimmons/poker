import { usePoker } from "../contexts/PokerContext";
import { ESTIMATE_OPTIONS } from "../types/poker";
import { cn } from "../lib/utils";
import { Check } from "lucide-react";

export const EstimateSelector = () => {
  const { gameState, vote } = usePoker();

  return (
    <div className="border border-border/50 rounded p-3 bg-card">
      <h3 className="text-foreground text-xs font-medium uppercase tracking-wider mb-2">
        Estimate
      </h3>

      <div className="space-y-1.5">
        {ESTIMATE_OPTIONS.map((option) => {
          const isSelected = gameState.myVote === option.points;

          return (
            <button
              key={option.points}
              onClick={() => vote(option.points)}
              disabled={gameState.revealed}
              className={cn(
                "w-full text-left p-2 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-sm",
                isSelected
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>{option.icon}</span>
                  <div>
                    <div className="font-medium text-xs">{option.label}</div>
                    <div className={cn(
                      "text-[10px]",
                      isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {option.description}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-3 h-3" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {gameState.myVote !== undefined && (
        <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded">
          <div className="text-green-500 text-xs font-mono flex items-center gap-1.5">
            <Check className="w-3 h-3" />
            VOTED: {gameState.myVote}
          </div>
        </div>
      )}
    </div>
  );
};
