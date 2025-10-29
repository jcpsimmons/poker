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

  const handleAutoReconnectFailed = (error: string) => {
    console.error("Auto-reconnect failed:", error);
    // Set joined to false to show join page
    setJoined(false);
    // Show error toast notification
    toast.error("Cannot rejoin session", {
      description: error,
      duration: 5000,
    });
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

  // Note: Removed cross-tab sync via storage events
  // Each tab manages its own session independently to prevent
  // one tab's failed reconnect from kicking out other tabs

  return (
    <PokerProvider onAutoReconnectFailed={handleAutoReconnectFailed}>
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
