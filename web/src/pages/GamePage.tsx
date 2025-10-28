import { Header } from "../components/layout/Header";
import { StatusBar } from "../components/layout/StatusBar";
import { IssueCard } from "../components/IssueCard";
import { EstimateSelector } from "../components/EstimateSelector";
import { VoteDisplay } from "../components/VoteDisplay";
import { HostControls } from "../components/HostControls";
import { Confetti } from "../components/Confetti";

export const GamePage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-3 py-3 space-y-3">
        <IssueCard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <EstimateSelector />
          <VoteDisplay />
        </div>
        <HostControls />
      </main>

      <StatusBar />
      <Confetti />
    </div>
  );
};
