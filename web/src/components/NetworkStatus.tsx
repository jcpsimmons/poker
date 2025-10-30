import { Panel } from "./layout/Panel";
import { Activity, Wifi, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePoker } from "../contexts/PokerContext";
import { cn } from "../lib/utils";

export const NetworkStatus = () => {
  const { computedMetrics, gameState } = usePoker();

  const getStabilityColor = () => {
    switch (computedMetrics.connectionStability) {
      case "STABLE":
        return "text-green-500";
      case "UNSTABLE":
        return "text-yellow-500";
      case "CRITICAL":
        return "text-red-500";
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

  const bufferStatus = gameState.connected ? "HEALTHY" : "OFFLINE";
  const bufferColor = gameState.connected ? "text-green-500" : "text-red-500";

  return (
    <Panel 
      title="COMMS" 
      className="w-full md:w-1/2 flex flex-col"
      contentClassName="flex flex-col flex-1"
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

