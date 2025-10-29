import { usePoker } from "../contexts/PokerContext";
import { Panel } from "./layout/Panel";

export const VoteStatus = () => {
  const { gameState } = usePoker();

  // Count how many people have voted (votes array contains all who voted)
  const votedCount = gameState.votes.length;
  const totalCount = gameState.participants;
  
  // Calculate percentage for color coding
  const percentage = totalCount > 0 ? (votedCount / totalCount) * 100 : 0;
  
  // Determine color based on percentage
  const getTextColor = () => {
    if (percentage === 0) return "text-muted-foreground";
    if (percentage === 100) return "text-green-500";
    if (percentage >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Panel 
      title="STATUS" 
      className="w-full h-full flex flex-col"
      contentClassName="flex-1 flex items-center justify-center p-0"
    >
      <div className="flex flex-col items-center justify-center gap-1">
        <div className={`font-mono text-xs ${getTextColor()}`}>
          {votedCount}/{totalCount}
        </div>
        <div className={`font-mono text-xs ${getTextColor()}`}>
          VOTED
        </div>
      </div>
    </Panel>
  );
};

