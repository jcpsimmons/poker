import { X } from "lucide-react";
import { usePoker } from "../../contexts/PokerContext";

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal = ({ isOpen, onClose }: StatsModalProps) => {
  const { gameState } = usePoker();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border/50 rounded p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-foreground font-mono uppercase tracking-wider">
            STATISTICS
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-foreground">
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">ROUND</span>
            <span className="font-medium text-sm font-mono">{gameState.roundNumber}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">PARTICIPANTS</span>
            <span className="font-medium text-sm font-mono">{gameState.participants}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">CURRENT ISSUE</span>
            <span className="font-medium text-right ml-4 flex-1 text-sm font-mono">
              {gameState.currentIssue}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">AVERAGE POINTS</span>
            <span className="font-medium text-sm font-mono">{gameState.averagePoints}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">VOTES CAST</span>
            <span className="font-medium text-sm font-mono">{gameState.votes.length}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">STATUS</span>
            <span className={`font-medium text-sm font-mono ${gameState.revealed ? "text-green-500" : "text-foreground"}`}>
              {gameState.revealed ? "REVEALED" : "VOTING"}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full bg-foreground hover:bg-foreground/90 text-background font-mono text-xs py-2 px-4 rounded transition-all"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

