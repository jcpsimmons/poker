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
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1E293B] border-2 border-primary rounded-xl p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            📝 Update Issue
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {gameState.pendingIssue && gameState.pendingIssue.source === "linear" && !isCustomMode ? (
            <div className="bg-info/10 border border-info rounded-lg p-4">
              <div className="text-info font-bold text-lg mb-2">
                {gameState.pendingIssue.identifier}: {gameState.pendingIssue.title}
              </div>
              {gameState.pendingIssue.description && (
                <div className="text-white text-sm mb-2 max-h-40 overflow-y-auto">
                  {gameState.pendingIssue.description}
                </div>
              )}
              {gameState.pendingIssue.url && (
                <a
                  href={gameState.pendingIssue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-info hover:text-info/80 text-sm"
                >
                  🔗 View in Linear
                </a>
              )}
            </div>
          ) : null}

          <div>
            <label className="text-secondary font-semibold block mb-2">
              {isCustomMode ? "Custom Issue:" : "Or enter custom issue:"}
            </label>
            <input
              type="text"
              value={customIssue}
              onChange={(e) => setCustomIssue(e.target.value)}
              placeholder="Enter issue title..."
              className="w-full bg-[#374151] text-white border border-secondary rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted">
            <button
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-accent hover:text-accent/80 font-medium"
            >
              {isCustomMode ? "← Back to Linear issue" : "→ Use custom issue instead"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-muted/20 hover:bg-muted/30 text-white font-bold py-3 px-4 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              (isCustomMode && !customIssue.trim()) ||
              (!isCustomMode && !gameState.pendingIssue)
            }
            className="flex-1 bg-success hover:bg-success/90 text-black font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load Issue
          </button>
        </div>
      </div>
    </div>
  );
};

