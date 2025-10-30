import { Panel } from "./layout/Panel";
import { Activity, Wifi, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePoker } from "../contexts/PokerContext";
import { cn } from "../lib/utils";

export const NetworkStatus = () => {
  const { computedMetrics, gameState } = usePoker();

  const getStabilityColor = () => {
    switch (computedMetrics.connectionStability) {
      case "STABLE":
        return "text-accent";
      case "UNSTABLE":
        return "text-primary";
      case "CRITICAL":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getStabilityIcon = () => {
    switch (computedMetrics.connectionStability) {
      case "STABLE":
        return <CheckCircle2 className="w-3 h-3" />;
      case "UNSTABLE":
        return <AlertTriangle className="w-3 h-3" />;
      case "CRITICAL":
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <Activity className="w-3 h-3" />;
    }
  };

  const getVariant = (): "default" | "hostile" | "task" | "active" => {
    switch (computedMetrics.connectionStability) {
      case "STABLE":
        return "active";
      case "UNSTABLE":
        return "task";
      case "CRITICAL":
        return "hostile";
      default:
        return "default";
    }
  };

  const bufferStatus = gameState.connected ? "ONLINE" : "OFFLINE";
  const bufferColor = gameState.connected ? "text-accent" : "text-destructive";

  return (
    <Panel 
      title="NETWORK" 
      variant={getVariant()}
      className="w-full md:w-1/2 flex flex-col"
      contentClassName="flex flex-col flex-1 p-3"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">
              THROUGHPUT
            </span>
          </div>
          <span className="text-xs font-mono text-foreground">
            {computedMetrics.messageThroughput} msg/min
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">
              CONN DUR
            </span>
          </div>
          <span className="text-xs font-mono text-foreground">
            {computedMetrics.connectionDuration}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStabilityIcon()}
            <span className="text-xs font-mono text-muted-foreground">
              STABILITY
            </span>
          </div>
          <span className={cn("text-xs font-mono", getStabilityColor())}>
            {computedMetrics.connectionStability}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", bufferColor)} />
            <span className="text-xs font-mono text-muted-foreground">
              BUFFER
            </span>
          </div>
          <span className={cn("text-xs font-mono", bufferColor)}>
            {bufferStatus}
          </span>
        </div>
      </div>
    </Panel>
  );
};

