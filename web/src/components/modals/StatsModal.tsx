import { X } from "lucide-react";
import { usePoker } from "../../contexts/PokerContext";

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal = ({ isOpen, onClose }: StatsModalProps) => {
  const { gameState } = usePoker();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1E293B] border-2 border-primary rounded-xl p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            📊 Session Statistics
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4 text-white">
          <div className="flex justify-between items-center py-2 border-b border-muted/20">
            <span className="text-muted">Round:</span>
            <span className="font-bold text-xl">{gameState.roundNumber}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-muted/20">
            <span className="text-muted">Participants:</span>
            <span className="font-bold text-xl">{gameState.participants}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-muted/20">
            <span className="text-muted">Current Issue:</span>
            <span className="font-bold text-right ml-4 flex-1">
              {gameState.currentIssue}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-muted/20">
            <span className="text-muted">Average Points:</span>
            <span className="font-bold text-xl">{gameState.averagePoints}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-muted/20">
            <span className="text-muted">Votes Cast:</span>
            <span className="font-bold text-xl">{gameState.votes.length}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-muted/20">
            <span className="text-muted">Status:</span>
            <span className={`font-bold ${gameState.revealed ? "text-success" : "text-warning"}`}>
              {gameState.revealed ? "Revealed" : "Voting"}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3 px-4 rounded-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

