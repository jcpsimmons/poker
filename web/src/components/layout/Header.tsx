import { usePoker } from "../../contexts/PokerContext";
import { Shield, Activity, LogOut, AlertTriangle } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/utils";

interface HeaderProps {
  onLeave: () => void;
}

export const Header = ({ onLeave }: HeaderProps) => {
  const { gameState, leave, computedMetrics } = usePoker();

  const handleLeave = () => {
    leave();
    onLeave();
  };

  const networkQuality = computedMetrics.connectionStability === "STABLE" ? "EXCELLENT" : 
                         computedMetrics.connectionStability === "UNSTABLE" ? "DEGRADED" : "POOR";
  const networkColor = computedMetrics.connectionStability === "STABLE" ? "text-green-500" :
                       computedMetrics.connectionStability === "UNSTABLE" ? "text-yellow-500" : "text-red-500";

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
              <Badge variant="primary" className="text-[10px]" data-testid="host-badge">
                HOST
              </Badge>
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
            <span className={`font-mono text-xs ${gameState.connected ? 'text-green-500' : 'text-red-500'}`}>
              {gameState.connected ? 'LINK' : 'DOWN'}
            </span>
            <span className="text-muted-foreground font-m+) text-xs hidden md:inline">
              {window.location.host.split(':')[0]}
            </span>
          </div>
          <div className="h-3 w-px bg-border hidden xl:block" />
          <div className="items-center gap-1.5 hidden xl:flex">
            <AlertTriangle className={cn("w-3 h-3", networkColor)} />
            <span className={cn("font-mono text-xs", networkColor)}>{networkQuality}</span>
          </div>
          <div className="h-3 w-px bg-border hidden sm:block" />
          <Button
            onClick={handleLeave}
            icon={LogOut}
            size="sm"
            variant="base"
            className="px-2 py-1 border-border/50 hover:bg-muted"
            data-testid="leave-button"
          >
            <span className="hidden sm:inline">LEAVE</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
