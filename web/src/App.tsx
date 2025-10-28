import { useState } from "react";
import { PokerProvider } from "./contexts/PokerContext";
import { JoinPage } from "./pages/JoinPage";
import { GamePage } from "./pages/GamePage";

function App() {
  const [joined, setJoined] = useState(false);

  return (
    <PokerProvider>
      {!joined ? (
        <JoinPage onJoin={() => setJoined(true)} />
      ) : (
        <GamePage />
      )}
    </PokerProvider>
  );
}

export default App;
