import { X } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1E293B] border-2 border-primary rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            ⌨️ How to Use
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-secondary font-bold text-lg mb-3">🎮 For Everyone</h3>
            <ul className="space-y-2 text-white">
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold min-w-[80px]">Click</span>
                <span>Select an estimate to vote</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold min-w-[80px]">Wait</span>
                <span>See when others have voted (card icon)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold min-w-[80px]">Reveal</span>
                <span>Host reveals votes to show results</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-secondary font-bold text-lg mb-3">🎲 For Hosts Only</h3>
            <ul className="space-y-2 text-white">
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold min-w-[120px]">Next Issue</span>
                <span>Load next Linear issue or enter custom issue</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold min-w-[120px]">Reveal</span>
                <span>Show all votes to the team</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold min-w-[120px]">Clear</span>
                <span>Start new round for same issue</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold min-w-[120px]">Stats</span>
                <span>View session statistics</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-secondary font-bold text-lg mb-3">📊 Estimate Guide</h3>
            <ul className="space-y-2 text-white">
              <li><span className="text-xl mr-2">📝</span> <strong>1 point:</strong> Tiny task (to-do list item)</li>
              <li><span className="text-xl mr-2">🌅</span> <strong>2 points:</strong> Part of a day</li>
              <li><span className="text-xl mr-2">☀️</span> <strong>3 points:</strong> Full day of work</li>
              <li><span className="text-xl mr-2">📅</span> <strong>5 points:</strong> 2-3 days plus communication</li>
              <li><span className="text-xl mr-2">📆</span> <strong>8 points:</strong> About a week</li>
              <li><span className="text-xl mr-2">💥</span> <strong>13 points:</strong> Too big! Break it down</li>
            </ul>
          </div>

          <div>
            <h3 className="text-secondary font-bold text-lg mb-3">✨ Special Features</h3>
            <ul className="space-y-2 text-white">
              <li className="flex items-start gap-2">
                <span className="text-success font-bold">🎉</span>
                <span>Confetti animation when team reaches consensus!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success font-bold">🔗</span>
                <span>Linear integration automatically posts results as comments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success font-bold">🎴</span>
                <span>Hidden votes show animated card backs until reveal</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-muted/20">
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3 px-4 rounded-lg transition-all"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

