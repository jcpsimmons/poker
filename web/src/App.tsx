import { useState, useEffect, useRef } from "react";
import { PokerProvider } from "./contexts/PokerContext";
import { JoinPage } from "./pages/JoinPage";
import { GamePage } from "./pages/GamePage";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

function App() {
  // Check if there's an active session on mount
  const [joined, setJoined] = useState(() => {
    return localStorage.getItem('poker_active_session') === 'true';
  });

  const hasShownWelcome = useRef(false);

  const handleLeave = () => {
    setJoined(false);
  };

  // Show welcome message on initial load
  useEffect(() => {
    if (!hasShownWelcome.current) {
      hasShownWelcome.current = true;
      toast.success("Welcome to Planning Poker! 🎴", {
        description: joined ? "Reconnecting to your session..." : "Ready to start estimating?",
        duration: 3000,
      });
    }
  }, []);

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
      <Toaster position="top-center" />
    </PokerProvider>
  );
}

export default App;
