import { useState } from "react";
import { usePoker } from "../contexts/PokerContext";
import { User, Server, Crown } from "lucide-react";

interface JoinPageProps {
  onJoin: () => void;
}

export const JoinPage = ({ onJoin }: JoinPageProps) => {
  const { connect } = usePoker();
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('poker_username') || '';
  });
  const [serverUrl, setServerUrl] = useState(() => {
    return localStorage.getItem('poker_server_url') || 'ws://localhost:9867/ws';
  });
  const [isHost, setIsHost] = useState(() => {
    return localStorage.getItem('poker_is_host') === 'true';
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (!serverUrl.trim()) {
      setError("Server URL is required");
      return;
    }

    try {
      setConnecting(true);
      setError("");
      
      // Save to localStorage for persistence
      localStorage.setItem('poker_username', username);
      localStorage.setItem('poker_server_url', serverUrl);
      localStorage.setItem('poker_is_host', isHost.toString());
      
      await connect(serverUrl, username, isHost);
      onJoin();
    } catch (err) {
      setError("Failed to connect. Please check the server URL and try again.");
      console.error("Connection error:", err);
      // Clear the active session flag if auto-join fails
      localStorage.removeItem('poker_active_session');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-medium mb-1 text-foreground font-mono tracking-wider uppercase">
            POKER
          </h1>
          <p className="text-muted-foreground text-xs font-mono">ESTIMATION PROTOCOL</p>
        </div>

        <div className="border border-border/50 rounded p-4 bg-card">
          <div className="space-y-6">
            <div>
              <label className="block text-foreground text-xs font-medium mb-1 flex items-center gap-1.5 font-mono uppercase">
                <User className="w-3 h-3" />
                USER
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-background border border-border/50 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 text-foreground font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />
            </div>

            <div>
              <label className="block text-foreground text-xs font-medium mb-1 flex items-center gap-1.5 font-mono uppercase">
                <Server className="w-3 h-3" />
                SERVER
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="ws://localhost:9867/ws"
                className="w-full bg-background border border-border/50 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 text-foreground font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />
            </div>

            <div className="bg-muted rounded p-2 border border-border/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHost}
                  onChange={(e) => setIsHost(e.target.checked)}
                  className="w-3 h-3 rounded border-input"
                />
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3 h-3 text-foreground" />
                  <span className="text-xs font-mono text-foreground">HOST MODE</span>
                </div>
              </label>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive rounded-md p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-md transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {connecting ? (
                <>
                  <div className="w-3 h-3 border-2 border-background/20 border-t-background rounded-full animate-spin" />
                  <span>CONNECTING...</span>
                </>
              ) : (
                "JOIN"
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-muted-foreground text-xs font-mono">
          <p>SERVER: <code className="px-1">{serverUrl}</code></p>
        </div>
      </div>
    </div>
  );
};
