import { usePoker } from "../../contexts/PokerContext";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useMetrics } from "../../hooks/useMetrics";

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal = ({ isOpen, onClose }: StatsModalProps) => {
  const { gameState, computedMetrics } = usePoker();
  const { metrics: metricsState } = useMetrics();

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

          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">SESSION DURATION</span>
            <span className="font-medium text-sm font-mono">{computedMetrics.sessionUptime}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">AVG ROUND TIME</span>
            <span className="font-medium text-sm font-mono">{computedMetrics.avgRoundTime}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">CONSENSUS RATE</span>
            <span className="font-medium text-sm font-mono">{computedMetrics.consensusRate.toFixed(1)}%</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">CONNECTION STABILITY</span>
            <span className={`font-medium text-sm font-mono ${
              computedMetrics.connectionStability === "STABLE" ? "text-green-500" :
              computedMetrics.connectionStability === "UNSTABLE" ? "text-yellow-500" : "text-red-500"
            }`}>
              {computedMetrics.connectionStability}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">TOTAL MESSAGES</span>
            <span className="font-medium text-sm font-mono">{metricsState.totalMessages}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-mono text-xs">MESSAGE THROUGHPUT</span>
            <span className="font-medium text-sm font-mono">{computedMetrics.messageThroughput} msg/min</span>
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

