import { usePoker } from "../contexts/PokerContext";
import { Panel } from "./layout/Panel";
import { GripVertical, Edit2, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { QueueItemModal } from "./modals/QueueItemModal";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

export const Queue = () => {
  const { gameState, deleteQueueItem, reorderQueue, confirmIssue } = usePoker();
  const { queueItems = [], isHost, currentIssueId } = gameState;
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isHost) return;
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isHost) return;
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (!isHost) return;
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (dragIndex === dropIndex) return;

    const newOrder = [...queueItems];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    
    // Update indices
    const itemIds = newOrder.map((item) => item.id);
    reorderQueue(itemIds);
  };

  const handleLoadIssue = (item: typeof queueItems[0]) => {
    if (!isHost) return;
    confirmIssue(item.identifier, -1, item.source === "custom");
  };

  const isCurrentIssue = (item: typeof queueItems[0]) => {
    if (item.source === "linear" && item.linearId && currentIssueId) {
      // For Linear issues, check if identifier matches current issue
      return item.identifier === currentIssueId;
    }
    if (item.source === "custom" && currentIssueId) {
      return item.identifier === currentIssueId;
    }
    return false;
  };

  return (
    <>
      <Panel title="VOTING QUEUE" className="w-full">
        <div className="flex flex-col gap-2">
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {queueItems.length === 0 ? (
              <div className="text-xs font-mono text-muted-foreground text-center py-4">
                Queue is empty
              </div>
            ) : (
              queueItems.map((item, index) => {
                const isCurrent = isCurrentIssue(item);
                return (
                  <div
                    key={item.id}
                    draggable={isHost}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`
                      flex items-center gap-2 p-2 rounded border
                      ${isCurrent ? "bg-primary/10 border-primary/50" : "bg-muted/50 border-border/50"}
                      ${isHost ? "cursor-move hover:bg-muted/80" : ""}
                      transition-colors
                    `}
                  >
                    {isHost && (
                      <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-foreground font-medium">
                          {item.identifier}
                        </span>
                        {item.source === "linear" && (
                          <Badge variant="info" className="text-[10px]">
                            LINEAR
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="primary" className="text-[10px]">
                            CURRENT
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground truncate">
                        {item.title}
                      </div>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          onClick={() => handleLoadIssue(item)}
                          variant="primary"
                          size="sm"
                          title="Load this issue"
                        >
                          LOAD
                        </Button>
                        <button
                          onClick={() => setEditingItem(item.id)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Edit item"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteQueueItem(item.id)}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {isHost && (
            <Button
              onClick={() => setShowAddModal(true)}
              icon={Plus}
              className="w-full flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              ADD TO QUEUE
            </Button>
          )}
        </div>
      </Panel>
      {isHost && (
        <>
          {editingItem && (
            <QueueItemModal
              isOpen={true}
              onClose={() => setEditingItem(null)}
              item={queueItems.find((i) => i.id === editingItem) || undefined}
            />
          )}
          {showAddModal && (
            <QueueItemModal
              isOpen={true}
              onClose={() => setShowAddModal(false)}
            />
          )}
        </>
      )}
    </>
  );
};

