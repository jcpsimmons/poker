import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { PokerWebSocket } from "../lib/websocket";
import type {
  GameState,
  Message,
  MessageType,
  RevealPayload,
  IssueSuggestedPayload,
  IssueLoadedPayload,
  CurrentIssuePayload,
  VoteStatusPayload,
} from "../types/poker";

interface PokerContextType {
  gameState: GameState;
  ws: PokerWebSocket | null;
  connect: (url: string, username: string, isHost: boolean) => Promise<void>;
  disconnect: () => void;
  leave: () => void;
  vote: (points: number) => void;
  reveal: () => void;
  clear: () => void;
  confirmIssue: (identifier: string, queueIndex: number, isCustom: boolean) => void;
}

const PokerContext = createContext<PokerContextType | null>(null);

export const usePoker = () => {
  const context = useContext(PokerContext);
  if (!context) {
    throw new Error("usePoker must be used within PokerProvider");
  }
  return context;
};

interface PokerProviderProps {
  children: React.ReactNode;
}

export const PokerProvider: React.FC<PokerProviderProps> = ({ children }) => {
  const [ws, setWs] = useState<PokerWebSocket | null>(null);
  const [gameState, setGameState] = useState<GameState>(() => {
    // Restore state from localStorage if available
    const hasActiveSession = localStorage.getItem('poker_active_session') === 'true';
    if (hasActiveSession) {
      const username = localStorage.getItem('poker_username') || "";
      const isHost = localStorage.getItem('poker_is_host') === 'true';
      return {
        connected: false, // Will be set to true when WS reconnects
        username,
        isHost,
        currentIssue: "Reconnecting...",
        currentIssueId: "",
        participants: 0,
        votes: [],
        revealed: false,
        averagePoints: "0",
        roundNumber: 1,
      };
    }
    return {
      connected: false,
      username: "",
      isHost: false,
      currentIssue: "Waiting for host to set issue...",
      currentIssueId: "",
      participants: 0,
      votes: [],
      revealed: false,
      averagePoints: "0",
      roundNumber: 1,
    };
  });

  const handleMessage = useCallback((message: Message) => {
    console.log("Received message:", message);

    switch (message.type as MessageType) {
      case "currentIssue": {
        try {
          const payload: CurrentIssuePayload = typeof message.payload === 'string'
            ? JSON.parse(message.payload)
            : message.payload;
          setGameState((prev) => ({
            ...prev,
            currentIssue: payload.text,
            linearIssue: payload.linearIssue,
            revealed: false,
            votes: [],
            myVote: undefined,
            roundNumber: prev.roundNumber + 1,
          }));
        } catch {
          // Fallback for simple string payload
          setGameState((prev) => ({
            ...prev,
            currentIssue: message.payload,
            linearIssue: undefined,
            revealed: false,
            votes: [],
            myVote: undefined,
            roundNumber: prev.roundNumber + 1,
          }));
        }
        break;
      }

      case "participantCount": {
        const count = parseInt(message.payload);
        setGameState((prev) => ({ ...prev, participants: count }));
        break;
      }

      case "currentEstimate": {
        // Individual vote update (not used in current UI but kept for compatibility)
        break;
      }

      case "revealData": {
        const payload: RevealPayload = typeof message.payload === 'string' 
          ? JSON.parse(message.payload)
          : message.payload;
        setGameState((prev) => ({
          ...prev,
          revealed: true,
          averagePoints: payload.pointAvg,
          votes: payload.estimates.map((est) => ({
            username: est.user,
            points: est.estimate,
            revealed: true,
          })),
        }));
        break;
      }

      case "clearBoard": {
        setGameState((prev) => ({
          ...prev,
          revealed: false,
          votes: [],
          myVote: undefined,
        }));
        break;
      }

      case "issueSuggested": {
        const payload: IssueSuggestedPayload = typeof message.payload === 'string'
          ? JSON.parse(message.payload)
          : message.payload;
        setGameState((prev) => ({
          ...prev,
          pendingIssue: payload,
        }));
        break;
      }

      case "issueLoaded": {
        const payload: IssueLoadedPayload = typeof message.payload === 'string'
          ? JSON.parse(message.payload)
          : message.payload;
        setGameState((prev) => ({
          ...prev,
          currentIssue: payload.title,
          currentIssueId: payload.identifier,
          pendingIssue: undefined,
        }));
        break;
      }

      case "issueStale": {
        console.warn("Issue queue changed, refresh needed");
        break;
      }

      case "voteStatus": {
        const payload: VoteStatusPayload = typeof message.payload === 'string'
          ? JSON.parse(message.payload)
          : message.payload;
        
        console.log("Vote status update:", payload);
        
        // Update votes array from server's source of truth
        setGameState((prev) => {
          const votes = payload.voters
            .filter(voter => voter.hasVoted)
            .map(voter => ({
              username: voter.username,
              points: "", // Don't show points until reveal
              revealed: false,
            }));
          
          console.log(`Updating votes: ${votes.length} voted out of ${payload.voters.length} total`);
          
          return {
            ...prev,
            votes,
          };
        });
        break;
      }

      default:
        console.log("Unhandled message type:", message.type);
    }
  }, []);

  const connect = useCallback(
    async (url: string, username: string, isHost: boolean) => {
      const websocket = new PokerWebSocket(url);

      await websocket.connect();
      websocket.joinSession(username, isHost);

      websocket.onMessage(handleMessage);

      // Re-join session when WebSocket reconnects automatically
      websocket.onReconnect(() => {
        console.log("WebSocket reconnected, re-joining session...");
        websocket.joinSession(username, isHost);
      });

      // Save active session to localStorage
      localStorage.setItem('poker_active_session', 'true');

      setWs(websocket);
      setGameState((prev) => ({
        ...prev,
        connected: true,
        username,
        isHost,
      }));
    },
    [handleMessage]
  );

  const disconnect = useCallback(() => {
    if (ws) {
      ws.disconnect();
      setWs(null);
      setGameState((prev) => ({ ...prev, connected: false }));
    }
  }, [ws]);

  const leave = useCallback(() => {
    // Disconnect from WebSocket
    if (ws) {
      ws.disconnect();
      setWs(null);
    }
    
    // Clear active session flag
    localStorage.removeItem('poker_active_session');
    
    // Reset game state to initial
    setGameState({
      connected: false,
      username: "",
      isHost: false,
      currentIssue: "Waiting for host to set issue...",
      currentIssueId: "",
      participants: 0,
      votes: [],
      revealed: false,
      averagePoints: "0",
      roundNumber: 1,
    });
  }, [ws]);

  const vote = useCallback(
    (points: number) => {
      if (ws) {
        ws.sendEstimate(points);
        // Just update our local vote - server will broadcast vote status to all clients
        setGameState((prev) => ({ 
          ...prev, 
          myVote: points,
        }));
      }
    },
    [ws]
  );

  const reveal = useCallback(() => {
    if (ws && gameState.isHost) {
      ws.revealRound();
    }
  }, [ws, gameState.isHost]);

  const clear = useCallback(() => {
    if (ws && gameState.isHost) {
      ws.resetBoard();
    }
  }, [ws, gameState.isHost]);

  const confirmIssue = useCallback(
    (identifier: string, queueIndex: number, isCustom: boolean) => {
      if (ws && gameState.isHost) {
        ws.sendIssueConfirm(identifier, queueIndex, isCustom);
      }
    },
    [ws, gameState.isHost]
  );

  // Auto-reconnect on mount if there's an active session
  useEffect(() => {
    const hasActiveSession = localStorage.getItem('poker_active_session') === 'true';
    const savedUsername = localStorage.getItem('poker_username');
    const savedServerUrl = localStorage.getItem('poker_server_url');
    const savedIsHost = localStorage.getItem('poker_is_host') === 'true';

    if (hasActiveSession && savedUsername && savedServerUrl && !ws) {
      console.log("Attempting to reconnect to previous session...");
      connect(savedServerUrl, savedUsername, savedIsHost).catch((error) => {
        console.error("Failed to reconnect:", error);
        // Clear session if reconnection fails
        localStorage.removeItem('poker_active_session');
      });
    }
  }, [connect, ws]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: PokerContextType = {
    gameState,
    ws,
    connect,
    disconnect,
    leave,
    vote,
    reveal,
    clear,
    confirmIssue,
  };

  return <PokerContext.Provider value={value}>{children}</PokerContext.Provider>;
};

