import { usePoker } from "../../contexts/PokerContext";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { HelpModal } from "../modals/HelpModal";

export const StatusBar = () => {
  const { gameState } = usePoker();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <div className="border-t border-border/50 bg-background px-3 py-1.5">
        <div className="container mx-auto flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{gameState.username}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="w-3 h-3" />
              <span>HELP</span>
            </button>
            <span className="text-muted-foreground">v2.0</span>
          </div>
        </div>
      </div>
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
};
