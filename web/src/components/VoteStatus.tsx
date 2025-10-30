import { usePoker } from "../contexts/PokerContext";
import { Panel } from "./layout/Panel";
import { cn } from "../lib/utils";

export const VoteStatus = () => {
  const { gameState } = usePoker();

  // Count how many people have voted (votes array contains all who voted)
  const votedCount = gameState.votes.length;
  const totalCount = gameState.participants;
  
  // Calculate percentage for color coding
  const percentage = totalCount > 0 ? (votedCount / totalCount) * 100 : 0;
  
  // Determine variant and color based on percentage
  const getVariant = (): "default" | "hostile" | "task" | "active" => {
    if (percentage === 100) return "active";
    if (percentage >= 50) return "task";
    if (percentage > 0) return "hostile";
    return "default";
  };
  
  const getTextColor = () => {
    if (percentage === 0) return "text-muted-foreground";
    if (percentage === 100) return "text-accent";
    if (percentage >= 50) return "text-primary";
    return "text-destructive";
  };

  return (
    <Panel 
      title="STATUS" 
      variant={getVariant()}
      className="w-full h-full flex flex-col"
      contentClassName="flex-1 flex items-center justify-center p-2"
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <div className={cn("font-mono text-4xl font-bold tabular-nums", getTextColor())}>
          {votedCount}<span className="text-muted-foreground text-2xl">/{totalCount}</span>
        </div>
        <div className={cn("font-mono text-xs uppercase tracking-wider", getTextColor())}>
          VOTED
        </div>
      </div>
    </Panel>
  );
};

