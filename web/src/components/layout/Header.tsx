import { usePoker } from "../../contexts/PokerContext";
import { Shield, Activity, LogOut } from "lucide-react";

interface HeaderProps {
  onLeave: () => void;
}

export const Header = ({ onLeave }: HeaderProps) => {
  const { gameState, leave } = usePoker();

  const handleLeave = () => {
    leave();
    onLeave();
  };

  return (
    <div className="border-b border-border/50 bg-background">
      <div className="container mx-auto px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-foreground" />
          <h1 className="text-sm font-medium text-foreground tracking-wider uppercase">
            POKER
          </h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-mono truncate max-w-[80px] sm:max-w-none">
              {gameState.username}
            </span>
            {gameState.isHost && (
              <span className="bg-foreground text-background px-1.5 py-0.5 rounded font-mono text-[10px]">
                HOST
              </span>
            )}
          </div>
          <div className="h-3 w-px bg-border hidden sm:block" />
          <div className="items-center gap-1.5 hidden sm:flex">
            <div className="relative">
              <Activity className={`w-3 h-3 ${gameState.connected ? 'text-green-500' : 'text-red-500'}`} />
              <span
                className={`absolute inset-0 rounded-full ${
                  gameState.connected
                    ? "bg-green-500 animate-ping opacity-20"
                    : ""
                }`}
              />
            </div>
            <span className={`font-mono ${gameState.connected ? 'text-green-500' : 'text-red-500'}`}>
              {gameState.connected ? 'LINK' : 'DOWN'}
            </span>
            <span className="text-muted-foreground font-mono hidden md:inline">
              {window.location.host.split(':')[0]}
            </span>
          </div>
          <div className="h-3 w-px bg-border hidden sm:block" />
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-muted border border-border/50 cursor-pointer"
            aria-label="Leave session"
          >
            <LogOut className="w-3 h-3 text-foreground" />
            <span className="font-mono text-foreground hidden sm:inline">LEAVE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
