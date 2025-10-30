import { usePoker } from "../../contexts/PokerContext";
import { HelpCircle, Users, Clock, Dices, Timer, MessageSquare, Activity } from "lucide-react";
import { useState } from "react";
import { HelpModal } from "../modals/HelpModal";

export const StatusBar = () => {
  const { gameState, computedMetrics } = usePoker();
  const [showHelp, setShowHelp] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  // Get all participants from voters array (includes everyone, voted or not)
  const participants = gameState.voters
    .map(v => v.username)
    .sort();

  return (
    <>
      <div className="sticky bottom-0 border-t border-border/50 bg-background/95 backdrop-blur-sm px-3 py-1.5 z-10">
        <div className="container mx-auto flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center gap-1.5 relative cursor-pointer"
              onMouseEnter={() => setShowParticipants(true)}
              onMouseLeave={() => setShowParticipants(false)}
            >
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground">{gameState.participants}</span>
              
              {showParticipants && (
                <div className="absolute bottom-full left-0 mb-2 bg-card border border-border/50 rounded p-2 shadow-lg z-50 min-w-[150px] max-h-[200px] overflow-y-auto">
                  <div className="text-xs font-mono uppercase text-muted-foreground mb-1.5 pb-1 border-b border-border/50">
                    PARTICIPANTS ({gameState.participants})
                  </div>
                  {participants.length > 0 ? (
                    participants.map((username, idx) => (
                      <div 
                        key={idx} 
                        className={`text-xs font-mono py-0.5 ${username === gameState.username ? 'text-green-500' : 'text-foreground'}`}
                      >
                        {username === gameState.username ? `● ${username}` : username}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs font-mono text-muted-foreground py-0.5">
                      {gameState.revealed ? 'No participants' : 'Waiting for votes...'}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground font-mono">{gameState.averagePoints}</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Dices className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground font-mono">R{gameState.roundNumber}</span>
            </div>
            <div className="h-3 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-1.5 hidden sm:flex">
              <Timer className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground font-mono">{computedMetrics.sessionUptime}</span>
            </div>
            <div className="h-3 w-px bg-border hidden md:block" />
            <div className="flex items-center gap-1.5 hidden md:flex">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground font-mono">{computedMetrics.roundDuration}</span>
            </div>
            <div className="h-3 w-px bg-border hidden lg:block" />
            <div className="flex items-center gap-1.5 hidden lg:flex">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground font-mono">{computedMetrics.messageThroughput}/min</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
