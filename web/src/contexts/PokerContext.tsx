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
} from "../types/poker";

interface PokerContextType {
  gameState: GameState;
  ws: PokerWebSocket | null;
  connect: (url: string, username: string, isHost: boolean) => Promise<void>;
  disconnect: () => void;
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
  const [gameState, setGameState] = useState<GameState>({
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

  const handleMessage = useCallback((message: Message) => {
    console.log("Received message:", message);

    switch (message.type as MessageType) {
      case "currentIssue": {
        try {
          const payload: CurrentIssuePayload = JSON.parse(message.payload);
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
        const payload: RevealPayload = JSON.parse(message.payload);
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
        const payload: IssueSuggestedPayload = JSON.parse(message.payload);
        setGameState((prev) => ({
          ...prev,
          pendingIssue: payload,
        }));
        break;
      }

      case "issueLoaded": {
        const payload: IssueLoadedPayload = JSON.parse(message.payload);
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

  const vote = useCallback(
    (points: number) => {
      if (ws) {
        ws.sendEstimate(points);
        setGameState((prev) => ({ ...prev, myVote: points }));
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
    vote,
    reveal,
    clear,
    confirmIssue,
  };

  return <PokerContext.Provider value={value}>{children}</PokerContext.Provider>;
};

