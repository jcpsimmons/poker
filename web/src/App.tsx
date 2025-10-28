import { useState, useEffect } from "react";
import { PokerProvider } from "./contexts/PokerContext";
import { JoinPage } from "./pages/JoinPage";
import { GamePage } from "./pages/GamePage";

function App() {
  // Check if there's an active session on mount
  const [joined, setJoined] = useState(() => {
    return localStorage.getItem('poker_active_session') === 'true';
  });

  const handleLeave = () => {
    setJoined(false);
  };

  // Listen for storage events to sync tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'poker_active_session') {
        setJoined(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <PokerProvider>
      {!joined ? (
        <JoinPage onJoin={() => setJoined(true)} />
      ) : (
        <GamePage onLeave={handleLeave} />
      )}
    </PokerProvider>
  );
}

export default App;
