import { useState } from "react";
import { X } from "lucide-react";
import { usePoker } from "../../contexts/PokerContext";

interface IssuePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IssuePickerModal = ({ isOpen, onClose }: IssuePickerModalProps) => {
  const { gameState, confirmIssue } = usePoker();
  const [customIssue, setCustomIssue] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (isCustomMode && customIssue.trim()) {
      confirmIssue(customIssue.trim(), -1, true);
      setCustomIssue("");
      onClose();
    } else if (gameState.pendingIssue && !isCustomMode) {
      confirmIssue(
        gameState.pendingIssue.identifier,
        gameState.pendingIssue.queueIndex,
        false
      );
      onClose();
    } else if (gameState.queueItems.length > 0 && !isCustomMode) {
      // If no pending issue but queue has items, load first item from queue
      const firstItem = gameState.queueItems[0];
      confirmIssue(firstItem.identifier, -1, firstItem.source === "custom");
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-card border border-border/50 rounded p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-foreground font-mono uppercase tracking-wider">
            UPDATE ISSUE
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {gameState.pendingIssue && gameState.pendingIssue.source === "linear" && !isCustomMode && (
            <div className="bg-muted border border-border/50 rounded p-4">
              <div className="text-foreground font-medium text-sm mb-2 font-mono">
                {gameState.pendingIssue.identifier}: {gameState.pendingIssue.title}
              </div>
              {gameState.pendingIssue.description && (
                <div className="text-muted-foreground text-xs mb-2 max-h-40 overflow-y-auto font-mono">
                  {gameState.pendingIssue.description}
                </div>
              )}
              {gameState.pendingIssue.url && (
                <a
                  href={gameState.pendingIssue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-foreground/80 text-xs font-mono underline"
                >
                  View in Linear
                </a>
              )}
            </div>
          )}
          
          {!gameState.pendingIssue && gameState.queueItems.length > 0 && !isCustomMode && (
            <div className="bg-muted border border-border/50 rounded p-4">
              <div className="text-foreground font-medium text-sm mb-2 font-mono">
                Queue has {gameState.queueItems.length} item(s). Load the first item?
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                {gameState.queueItems[0].identifier}: {gameState.queueItems[0].title}
              </div>
            </div>
          )}

          <div>
            <label className="text-foreground font-medium block mb-2 text-xs font-mono uppercase">
              {isCustomMode ? "Custom Issue:" : "Or enter custom issue:"}
            </label>
            <input
              type="text"
              value={customIssue}
              onChange={(e) => setCustomIssue(e.target.value)}
              placeholder="Enter issue title..."
              className="w-full bg-background text-foreground border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-foreground hover:text-foreground/80 font-mono text-xs cursor-pointer"
            >
              {isCustomMode ? "← Back to Linear issue" : "→ Use custom issue instead"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-border/50 bg-transparent hover:bg-muted text-foreground font-mono text-xs py-2 px-4 rounded transition-all cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              (isCustomMode && !customIssue.trim()) ||
              (!isCustomMode && !gameState.pendingIssue && gameState.queueItems.length === 0)
            }
            className="flex-1 bg-foreground hover:bg-foreground/90 text-background font-mono text-xs py-2 px-4 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            LOAD ISSUE
          </button>
        </div>
      </div>
    </div>
  );
};

