import { usePoker } from "../../contexts/PokerContext";
import { Shield, Activity } from "lucide-react";

export const Header = () => {
  const { gameState } = usePoker();

  return (
    <div className="border-b border-border/50 bg-background">
      <div className="container mx-auto px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-foreground" />
          <h1 className="text-sm font-medium text-foreground tracking-wider uppercase">
            POKER
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-mono">
              {gameState.username}
            </span>
            {gameState.isHost && (
              <span className="bg-foreground text-background px-1.5 py-0.5 rounded font-mono text-[10px]">
                HOST
              </span>
            )}
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5">
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
            <span className="text-muted-foreground font-mono">
              {window.location.host.split(':')[0]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
