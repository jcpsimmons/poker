import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { usePoker } from "../../contexts/PokerContext";
import type { QueueItem } from "../../types/poker";

interface QueueItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: QueueItem; // If provided, we're editing; if not, we're adding
}

export const QueueItemModal = ({ isOpen, onClose, item }: QueueItemModalProps) => {
  const { addQueueItem, updateQueueItem } = usePoker();
  const [identifier, setIdentifier] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const isEdit = !!item;

  // Only allow editing custom items
  const isLinearItem = item?.source === "linear";

  useEffect(() => {
    if (item) {
      if (isLinearItem) {
        // Can't edit Linear items, just show them
        setIdentifier(item.identifier);
        setTitle(item.title);
        setDescription(item.description || "");
      } else {
        // Custom item, can edit
        setIdentifier(item.identifier);
        setTitle(item.title);
        setDescription(item.description || "");
      }
    } else {
      // New item
      setIdentifier("");
      setTitle("");
      setDescription("");
    }
  }, [item, isLinearItem]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (isLinearItem) {
      // Can't edit Linear items
      onClose();
      return;
    }

    if (!identifier.trim() || !title.trim()) {
      return; // Invalid input
    }

    if (isEdit && item) {
      updateQueueItem(item.id, identifier.trim(), title.trim(), description.trim() || undefined);
    } else {
      addQueueItem(identifier.trim(), title.trim(), description.trim() || undefined);
    }
    
    onClose();
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
      <div className="bg-card border border-border/50 rounded p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-foreground font-mono uppercase tracking-wider">
            {isEdit ? (isLinearItem ? "VIEW QUEUE ITEM" : "EDIT QUEUE ITEM") : "ADD TO QUEUE"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {isLinearItem && (
            <div className="bg-primary/10 border border-primary/50 rounded p-3 text-xs font-mono text-foreground">
              Linear issues cannot be edited. They are managed automatically from your Linear cycle.
            </div>
          )}

          <div>
            <label className="text-foreground font-medium block mb-2 text-xs font-mono uppercase">
              Identifier:
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g., FEAT-123 or Task Name"
              disabled={isLinearItem}
              className="w-full bg-background text-foreground border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          <div>
            <label className="text-foreground font-medium block mb-2 text-xs font-mono uppercase">
              Title:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title..."
              disabled={isLinearItem}
              className="w-full bg-background text-foreground border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          <div>
            <label className="text-foreground font-medium block mb-2 text-xs font-mono uppercase">
              Description (optional):
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Issue description..."
              disabled={isLinearItem}
              rows={4}
              className="w-full bg-background text-foreground border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all font-mono resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-border/50 bg-transparent hover:bg-muted text-foreground font-mono text-xs py-2 px-4 rounded transition-all cursor-pointer"
          >
            {isLinearItem ? "CLOSE" : "CANCEL"}
          </button>
          {!isLinearItem && (
            <button
              onClick={handleSubmit}
              disabled={!identifier.trim() || !title.trim()}
              className="flex-1 bg-foreground hover:bg-foreground/90 text-background font-mono text-xs py-2 px-4 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEdit ? "UPDATE" : "ADD"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

