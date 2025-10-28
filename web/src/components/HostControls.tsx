import { usePoker } from "../contexts/PokerContext";
import { Eye, RotateCcw, FileEdit, BarChart3 } from "lucide-react";
import { useState } from "react";
import { IssuePickerModal } from "./modals/IssuePickerModal";
import { StatsModal } from "./modals/StatsModal";
import { Panel } from "./layout/Panel";

export const HostControls = () => {
  const { gameState, reveal, clear } = usePoker();
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [showStats, setShowStats] = useState(false);

  if (!gameState.isHost) {
    return null;
  }

  return (
    <>
      <Panel title="HOST" className="w-80">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowIssuePicker(true)}
            className="flex-1 min-w-[100px] border border-border/50 bg-transparent hover:bg-foreground hover:text-background text-foreground font-mono text-xs py-2 px-3 rounded transition-all flex items-center justify-center gap-1.5"
          >
            <FileEdit className="w-3 h-3" />
            NEXT ISSUE
          </button>

          {!gameState.revealed ? (
            <button
              onClick={reveal}
              className="flex-1 min-w-[100px] border border-border/50 bg-transparent hover:bg-foreground hover:text-background text-foreground font-mono text-xs py-2 px-3 rounded transition-all flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3 h-3" />
              REVEAL
            </button>
          ) : (
            <button
              onClick={clear}
              className="flex-1 min-w-[100px] border border-border/50 bg-transparent hover:bg-foreground hover:text-background text-foreground font-mono text-xs py-2 px-3 rounded transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              CLEAR
            </button>
          )}

          <button
            onClick={() => setShowStats(true)}
            className="flex-1 min-w-[100px] border border-border/50 bg-transparent hover:bg-foreground hover:text-background text-foreground font-mono text-xs py-2 px-3 rounded transition-all flex items-center justify-center gap-1.5"
          >
            <BarChart3 className="w-3 h-3" />
            STATS
          </button>
        </div>
      </Panel>

      <IssuePickerModal
        isOpen={showIssuePicker}
        onClose={() => setShowIssuePicker(false)}
      />
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
    </>
  );
};
