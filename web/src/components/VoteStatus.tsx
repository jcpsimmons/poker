import { usePoker } from "../contexts/PokerContext";
import { CheckCircle2 } from "lucide-react";
import { Panel } from "./layout/Panel";
import { cn } from "../lib/utils";

export const VoteStatus = () => {
  const { gameState } = usePoker();

  // Count how many people have voted (votes array contains all who voted)
  const votedCount = gameState.votes.length;
  const totalCount = gameState.participants;
  
  console.log("VoteStatus render:", { votedCount, totalCount, votes: gameState.votes });
  
  // Calculate percentage for color coding
  const percentage = totalCount > 0 ? (votedCount / totalCount) * 100 : 0;
  
  // Determine color based on percentage
  const getColor = () => {
    if (percentage === 100) return "text-green-500";
    if (percentage >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getBgColor = () => {
    if (percentage === 100) return "bg-green-500/10 border-green-500/30";
    if (percentage >= 50) return "bg-yellow-500/10 border-yellow-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  return (
    <Panel 
      title="STATUS" 
      className="w-80"
      contentClassName={cn(getBgColor(), "rounded")}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className={`w-4 h-4 ${getColor()}`} />
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            VOTED
          </span>
          <span className={`text-2xl font-bold font-mono ${getColor()}`}>
            {votedCount}/{totalCount}
          </span>
        </div>
      </div>
    </Panel>
  );
};

