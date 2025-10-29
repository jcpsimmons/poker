import { useState } from "react";
import { usePoker } from "../../contexts/PokerContext";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface IssuePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IssuePickerModal = ({ isOpen, onClose }: IssuePickerModalProps) => {
  const { gameState, confirmIssue } = usePoker();
  const [customIssue, setCustomIssue] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="UPDATE ISSUE"
      containerClassName="max-w-2xl"
    >

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
            <Input
              type="text"
              value={customIssue}
              onChange={(e) => setCustomIssue(e.target.value)}
              placeholder="Enter issue title..."
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
        <Button
          onClick={onClose}
          variant="secondary"
        >
          CANCEL
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            (isCustomMode && !customIssue.trim()) ||
            (!isCustomMode && !gameState.pendingIssue && gameState.queueItems.length === 0)
          }
          variant="primary"
        >
          LOAD ISSUE
        </Button>
      </div>
    </Modal>
  );
};

