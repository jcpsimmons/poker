import { usePoker } from "../contexts/PokerContext";
import { Eye, RotateCcw, FileEdit, BarChart3 } from "lucide-react";
import { useState } from "react";
import { IssuePickerModal } from "./modals/IssuePickerModal";
import { StatsModal } from "./modals/StatsModal";

export const HostControls = () => {
  const { gameState, reveal, clear } = usePoker();
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [showStats, setShowStats] = useState(false);

  if (!gameState.isHost) {
    return null;
  }

  return (
    <>
      <div className="border border-border/50 rounded p-3 bg-card">
        <h3 className="text-foreground text-xs font-medium uppercase tracking-wider mb-2">
          Host
        </h3>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowIssuePicker(true)}
            className="flex-1 min-w-[100px] bg-foreground hover:bg-foreground/90 text-background font-mono text-xs py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-1.5"
          >
            <FileEdit className="w-3 h-3" />
            Next Issue
          </button>

          {!gameState.revealed ? (
            <button
              onClick={reveal}
              className="flex-1 min-w-[100px] bg-foreground hover:bg-foreground/90 text-background font-mono text-xs py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3 h-3" />
              Reveal
            </button>
          ) : (
            <button
              onClick={clear}
              className="flex-1 min-w-[100px] bg-foreground hover:bg-foreground/90 text-background font-mono text-xs py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          )}

          <button
            onClick={() => setShowStats(true)}
            className="flex-1 min-w-[100px] bg-foreground hover:bg-foreground/90 text-background font-mono text-xs py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-1.5"
          >
            <BarChart3 className="w-4 h-4" />
            Stats
          </button>
        </div>
      </div>

      <IssuePickerModal
        isOpen={showIssuePicker}
        onClose={() => setShowIssuePicker(false)}
      />
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
    </>
  );
};
