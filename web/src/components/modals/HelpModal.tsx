import { X } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="border border-border/50 bg-card rounded p-4 max-w-xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground uppercase tracking-wider font-mono">
            Help
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-2 text-foreground">Usage</h3>
            <ul className="space-y-1 text-sm text-foreground font-mono">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[60px]">Click</span>
                <span>Select an estimate to vote</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[60px]">Wait</span>
                <span>See when others have voted</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[60px]">Reveal</span>
                <span>Host reveals votes to show results</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-2 text-foreground">Host Controls</h3>
            <ul className="space-y-1 text-sm text-foreground font-mono">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[80px]">Next Issue</span>
                <span>Load next Linear issue or enter custom</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[80px]">Reveal</span>
                <span>Show all votes to the team</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[80px]">Clear</span>
                <span>Start new round for same issue</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[80px]">Stats</span>
                <span>View session statistics</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-2 text-foreground">Estimate Guide</h3>
            <ul className="space-y-1 text-sm text-foreground font-mono">
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground min-w-[20px] text-xs">1</span>
                <span>Tiny task (to-do list item)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground min-w-[20px] text-xs">2</span>
                <span>Part of a day</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground min-w-[20px] text-xs">3</span>
                <span>Full day of work</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground min-w-[20px] text-xs">5</span>
                <span>2-3 days plus communication</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground min-w-[20px] text-xs">8</span>
                <span>About a week</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground min-w-[20px] text-xs">13</span>
                <span>Too big! Break it down</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/50">
          <button
            onClick={onClose}
            className="w-full bg-foreground hover:bg-foreground/90 text-background font-mono text-sm py-2 px-3 rounded transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
