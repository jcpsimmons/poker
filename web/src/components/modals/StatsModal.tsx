import { usePoker } from "../../contexts/PokerContext";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal = ({ isOpen, onClose }: StatsModalProps) => {
  const { gameState } = usePoker();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="STATISTICS"
      containerClassName="max-w-lg"
    >

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
        <Button
          onClick={onClose}
          variant="primary"
          className="w-full"
        >
          CLOSE
        </Button>
      </div>
    </Modal>
  );
};

