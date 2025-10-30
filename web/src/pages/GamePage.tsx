import { Header } from "../components/layout/Header";
import { StatusBar } from "../components/layout/StatusBar";
import { EstimateSelector } from "../components/EstimateSelector";
import { VoteDisplay } from "../components/VoteDisplay";
import { VoteStatus } from "../components/VoteStatus";
import { HostControls } from "../components/HostControls";
import { Confetti } from "../components/Confetti";
import { CurrentIssue } from "../components/CurrentIssue";
import { Queue } from "../components/Queue";
import { TacticalFeed } from "../components/TacticalFeed";
import { NetworkStatus } from "../components/NetworkStatus";
import { usePoker } from "../contexts/PokerContext";

interface GamePageProps {
  onLeave: () => void;
}

export const GamePage = ({ onLeave }: GamePageProps) => {
  const { activities } = usePoker();
  
  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      data-testid="game-page"
    >
      <Header onLeave={onLeave} />
      
      <main className="flex-1 flex flex-col items-center px-3 py-3 w-full">
        <div className="w-full max-w-[652px] mx-auto space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch w-full">
            <div className="md:w-1/4">
              <VoteStatus />
            </div>
            <div className="md:w-3/4">
              <CurrentIssue />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-stretch justify-center w-full">
            <EstimateSelector />
            <VoteDisplay />
          </div>
          <div className="flex justify-center w-full">
            <HostControls />
          </div>
          <div className="w-full">
            <Queue />
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-stretch w-full">
            <TacticalFeed activities={activities} />
            <NetworkStatus />
          </div>
        </div>
      </main>

      <StatusBar />
      <Confetti />
    </div>
  );
};
