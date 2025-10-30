import { usePoker } from "../contexts/PokerContext";
import { Eye, RotateCcw, FileEdit, BarChart3, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { StatsModal } from "./modals/StatsModal";
import { Panel } from "./layout/Panel";
import { Button } from "./ui/Button";
import { toast } from "sonner";

export const HostControls = () => {
  const { gameState, reveal, clear, assignEstimate, confirmIssue } = usePoker();
  const [showStats, setShowStats] = useState(false);

  if (!gameState.isHost) {
    return null;
  }

  return (
    <>
      <div className="w-full md:w-80" data-testid="host-controls">
        <Panel title="HOST" className="w-full">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              // Auto-load next issue with same logic as IssuePickerModal
              if (gameState.pendingIssue) {
                confirmIssue(
                  gameState.pendingIssue.identifier,
                  gameState.pendingIssue.queueIndex,
                  false
                );
                toast.success(`Loaded issue: ${gameState.pendingIssue.identifier}`);
              } else if (gameState.queueItems.length > 0) {
                // If no pending issue but queue has items, load first item from queue
                const firstItem = gameState.queueItems[0];
                confirmIssue(firstItem.identifier, -1, firstItem.source === "custom");
                toast.success(`Loaded issue: ${firstItem.identifier}`);
              } else {
                toast.info("No issues in queue");
              }
            }}
            icon={FileEdit}
            className="flex-1 min-w-[100px]"
          >
            NEXT ISSUE
          </Button>

          {!gameState.revealed ? (
            <Button
              onClick={reveal}
              icon={Eye}
              className="flex-1 min-w-[100px]"
              data-testid="reveal-button"
            >
              REVEAL
            </Button>
          ) : (
            <Button
              onClick={clear}
              icon={RotateCcw}
              className="flex-1 min-w-[100px]"
              data-testid="clear-button"
            >
              CLEAR
            </Button>
          )}

          <Button
            onClick={() => setShowStats(true)}
            icon={BarChart3}
            className="flex-1 min-w-[100px]"
          >
            STATS
          </Button>

          <Button
            onClick={assignEstimate}
            disabled={!gameState.revealed || !gameState.linearIssue}
            icon={CheckCircle2}
            className="flex-1 min-w-[100px]"
            title={!gameState.linearIssue ? "No Linear issue active" : !gameState.revealed ? "Reveal votes first" : `Assign ${gameState.averagePoints} points to Linear issue`}
          >
            ASSIGN
          </Button>
        </div>
        </Panel>
      </div>

      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
    </>
  );
};
