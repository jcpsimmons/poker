import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Help"
      containerClassName="max-w-xl max-h-[80vh] overflow-y-auto p-4"
    >

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
        <Button
          onClick={onClose}
          variant="primary"
          className="w-full text-sm py-2 px-3"
        >
          CLOSE
        </Button>
      </div>
    </Modal>
  );
};
