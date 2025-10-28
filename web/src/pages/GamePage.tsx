import { Header } from "../components/layout/Header";
import { StatusBar } from "../components/layout/StatusBar";
import { EstimateSelector } from "../components/EstimateSelector";
import { VoteDisplay } from "../components/VoteDisplay";
import { VoteStatus } from "../components/VoteStatus";
import { HostControls } from "../components/HostControls";
import { Confetti } from "../components/Confetti";

interface GamePageProps {
  onLeave: () => void;
}

export const GamePage = ({ onLeave }: GamePageProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onLeave={onLeave} />
      
      <main className="flex-1 flex flex-col items-center px-3 py-3 space-y-3">
        <div className="flex gap-3 items-stretch">
          <EstimateSelector />
          <VoteDisplay />
        </div>
        <div className="flex gap-3 items-start">
          <VoteStatus />
          <HostControls />
        </div>
      </main>

      <StatusBar />
      <Confetti />
    </div>
  );
};
