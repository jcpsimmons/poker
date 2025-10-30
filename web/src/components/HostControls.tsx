import { usePoker } from "../contexts/PokerContext";
import { Eye, RotateCcw, FileEdit, BarChart3, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { IssuePickerModal } from "./modals/IssuePickerModal";
import { StatsModal } from "./modals/StatsModal";
import { Panel } from "./layout/Panel";
import { Button } from "./ui/Button";

export const HostControls = () => {
  const { gameState, reveal, clear, assignEstimate } = usePoker();
  const [showIssuePicker, setShowIssuePicker] = useState(false);
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
            onClick={() => setShowIssuePicker(true)}
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

      <IssuePickerModal
        isOpen={showIssuePicker}
        onClose={() => setShowIssuePicker(false)}
      />
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
    </>
  );
};
