import { useState, useEffect } from "react";
import { usePoker } from "../contexts/PokerContext";
import { User, Server, Crown, AlertCircle, Lock } from "lucide-react";
import { Input } from "../components/ui/Input";

interface JoinPageProps {
  onJoin: () => void;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const validateUsername = (username: string): ValidationResult => {
  // Trim whitespace
  const trimmed = username.trim();

  // Check if empty
  if (!trimmed) {
    return { valid: false, error: "Username is required" };
  }

  // Check minimum length
  if (trimmed.length < 2) {
    return { valid: false, error: "Username must be at least 2 characters" };
  }

  // Check maximum length
  if (trimmed.length > 20) {
    return { valid: false, error: "Username must be 20 characters or less" };
  }

  // Check for valid characters (alphanumeric, hyphens, underscores, spaces)
  const validPattern = /^[a-zA-Z0-9 _-]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: "Username can only contain letters, numbers, spaces, hyphens, and underscores" };
  }

  // Check if username is only whitespace
  if (trimmed.replace(/\s/g, '').length === 0) {
    return { valid: false, error: "Username cannot be only spaces" };
  }

  return { valid: true };
};

export const JoinPage = ({ onJoin }: JoinPageProps) => {
  const { connect } = usePoker();
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('poker_username') || '';
  });
  const [serverUrl, setServerUrl] = useState(() => {
    // Auto-detect WebSocket URL based on current page origin
    const savedUrl = localStorage.getItem('poker_server_url');
    if (savedUrl) return savedUrl;
    
    // Derive WebSocket URL from current window location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  });
  const [password, setPassword] = useState(() => {
    // Load password from localStorage (note: this is the plain password, not encoded)
    return localStorage.getItem('poker_auth_password') || '';
  });
  const [isHost, setIsHost] = useState(() => {
    return localStorage.getItem('poker_is_host') === 'true';
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");

  // Validate username on change
  useEffect(() => {
    if (username) {
      const validation = validateUsername(username);
      if (!validation.valid) {
        setUsernameError(validation.error || "");
      } else {
        setUsernameError("");
      }
    } else {
      setUsernameError("");
    }
  }, [username]);

  const handleConnect = async () => {
    // Validate username
    const validation = validateUsername(username);
    if (!validation.valid) {
      setError(validation.error || "Invalid username");
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
      
      // Store password if provided and encode credentials for WebSocket
      if (password) {
        localStorage.setItem('poker_auth_password', password);
        const credentials = btoa(`admin:${password}`);
        localStorage.setItem('poker_auth', credentials);
      } else {
        // Clear auth if password is empty
        localStorage.removeItem('poker_auth');
        localStorage.removeItem('poker_auth_password');
      }
      
      await connect(serverUrl, username, isHost);
      onJoin();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      
      if (errorMessage.includes("timeout")) {
        setError("Connection timeout. Make sure the server is running and accessible.");
      } else if (errorMessage.includes("refused")) {
        setError("Connection refused. The server may not be running.");
      } else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        setError("Authentication failed. Please check your password.");
        // Clear stored credentials on auth failure to allow retry
        localStorage.removeItem('poker_auth');
      } else {
        setError(`Failed to connect: ${errorMessage}`);
      }
      
      console.error("Connection error:", err);
      // Clear the active session flag if auto-join fails
      localStorage.removeItem('poker_active_session');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      data-testid="join-page"
    >
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
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                error={!!usernameError}
                className="px-2 py-1.5"
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                data-testid="username-input"
              />
              {usernameError && (
                <div className="mt-1 flex items-start gap-1.5 text-destructive text-xs">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{usernameError}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-foreground text-xs font-medium mb-1 flex items-center gap-1.5 font-mono uppercase">
                <Server className="w-3 h-3" />
                SERVER
              </label>
              <Input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="ws://localhost:9867/ws"
                className="px-2 py-1.5"
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />
            </div>

            <div>
              <label className="block text-foreground text-xs font-medium mb-1 flex items-center gap-1.5 font-mono uppercase">
                <Lock className="w-3 h-3" />
                PASSWORD (OPTIONAL)
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password if required"
                className="px-2 py-1.5"
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
                  data-testid="host-checkbox"
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
              disabled={connecting || !!usernameError}
              className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-md transition-colors hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="join-button"
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
