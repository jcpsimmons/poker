import { useState, useEffect } from "react";
import { usePoker } from "../../contexts/PokerContext";
import type { QueueItem } from "../../types/poker";
import { Modal } from "../ui/Modal";
import { Input, Textarea } from "../ui/Input";
import { Button } from "../ui/Button";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? (isLinearItem ? "VIEW QUEUE ITEM" : "EDIT QUEUE ITEM") : "ADD TO QUEUE"}
      containerClassName="max-w-md"
    >
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
          <Input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g., FEAT-123 or Task Name"
            disabled={isLinearItem}
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
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title..."
            disabled={isLinearItem}
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
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Issue description..."
            disabled={isLinearItem}
            rows={4}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button
          onClick={onClose}
          variant="secondary"
        >
          {isLinearItem ? "CLOSE" : "CANCEL"}
        </Button>
        {!isLinearItem && (
          <Button
            onClick={handleSubmit}
            disabled={!identifier.trim() || !title.trim()}
            variant="primary"
          >
            {isEdit ? "UPDATE" : "ADD"}
          </Button>
        )}
      </div>
    </Modal>
  );
};

