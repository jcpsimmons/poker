import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
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
  QueueSyncPayload,
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
  addQueueItem: (identifier: string, title: string, description?: string, index?: number) => void;
  updateQueueItem: (id: string, identifier?: string, title?: string, description?: string) => void;
  deleteQueueItem: (id: string) => void;
  reorderQueue: (itemIds: string[]) => void;
  assignEstimate: () => void;
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
  // Use refs to access latest state and ws in setTimeout callbacks
  const gameStateRef = useRef<GameState | null>(null);
  const wsRef = useRef<PokerWebSocket | null>(null);
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
        queueItems: [],
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
      queueItems: [],
    };
  });

  // Keep refs in sync with state for timeout callbacks
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
  useEffect(() => {
    wsRef.current = ws;
  }, [ws]);

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
            // Use linearIssue from payload if provided, otherwise preserve existing
            linearIssue: payload.linearIssue ?? prev.linearIssue,
            revealed: false,
            votes: [],
            myVote: undefined,
            roundNumber: prev.roundNumber + 1,
          }));
        } catch {
          // Fallback for simple string payload - preserve existing linearIssue
          setGameState((prev) => ({
            ...prev,
            currentIssue: message.payload,
            // Don't clear linearIssue for simple string payloads if we already have one
            // linearIssue stays as-is (prev.linearIssue)
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
        setGameState((prev) => {
          // Try to find Linear issue data from queue items
          let linearIssue = prev.linearIssue;
          
          // Check if this is in the queue as a Linear item
          const queueItem = prev.queueItems.find(item => 
            item.identifier === payload.identifier && item.source === "linear"
          );
          
          if (queueItem && queueItem.linearId) {
            linearIssue = {
              id: queueItem.linearId,
              identifier: queueItem.identifier,
              title: queueItem.title,
              description: queueItem.description || "",
              url: queueItem.url || "",
            };
          } else if (prev.pendingIssue && prev.pendingIssue.identifier === payload.identifier && prev.pendingIssue.source === "linear") {
            // Fallback to pendingIssue data
            linearIssue = {
              id: prev.pendingIssue.identifier, // Will be updated by currentIssue message if available
              identifier: prev.pendingIssue.identifier,
              title: prev.pendingIssue.title,
              description: prev.pendingIssue.description || "",
              url: prev.pendingIssue.url || "",
            };
          } else if (prev.linearIssue && prev.linearIssue.identifier === payload.identifier) {
            // Keep existing linearIssue if it matches
            linearIssue = prev.linearIssue;
          }
          
          return {
            ...prev,
            currentIssue: payload.title,
            currentIssueId: payload.identifier,
            pendingIssue: undefined,
            linearIssue: linearIssue,
          };
        });
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

      case "joinError": {
        // This will be handled by the connect function's error handler
        console.error("Join error from server:", message.payload);
        break;
      }

      case "queueSync": {
        const payload: QueueSyncPayload = typeof message.payload === 'string'
          ? JSON.parse(message.payload)
          : message.payload;
        setGameState((prev) => ({
          ...prev,
          queueItems: payload.items || [],
        }));
        break;
      }

      case "estimateAssignmentSuccess": {
        console.log("✅ estimateAssignmentSuccess received, starting auto-advance logic");
        const messageText = typeof message.payload === 'string' ? message.payload : "Estimate assigned successfully";
        toast.success(messageText, {
          duration: 3000,
        });

        // Auto-advance to next issue in queue (if host and queue has items)
        // Wait a moment for state to update (queue sync after assignment), then advance
        // Server will broadcast autoAdvance message to everyone when issue loads
        setTimeout(() => {
          console.log("⏰ Auto-advance timeout fired, checking state...");
          // Use refs to get latest state and ws
          const currentState = gameStateRef.current;
          const currentWs = wsRef.current;
          console.log("📊 Current state:", {
            isHost: currentState?.isHost,
            hasWs: !!currentWs,
            queueLength: currentState?.queueItems?.length,
            queueItems: currentState?.queueItems?.map(i => i.identifier)
          });
          
          if (currentState && currentState.isHost && currentWs) {
            // Get the first item from the queue (current issue should already be removed)
            if (currentState.queueItems && currentState.queueItems.length > 0) {
              const nextItem = currentState.queueItems[0];
              console.log("🚀 Auto-advancing to next issue:", nextItem.identifier, "isCustom:", nextItem.source === "custom");
              // Load the next issue (server will send autoAdvance notification to everyone)
              currentWs.sendIssueConfirm(nextItem.identifier, -1, nextItem.source === "custom");
              console.log("✅ sendIssueConfirm called");
            } else {
              console.log("❌ Auto-advance skipped: queue is empty or queueItems is undefined");
            }
          } else {
            console.log("❌ Auto-advance skipped:", {
              hasState: !!currentState,
              isHost: currentState?.isHost,
              hasWs: !!currentWs
            });
          }
        }, 2000); // Wait 2 seconds to ensure queue sync has updated the state
        
        break;
      }

      case "estimateAssignmentError": {
        const messageText = typeof message.payload === 'string' ? message.payload : "Failed to assign estimate";
        toast.error(messageText, {
          duration: 5000,
        });
        break;
      }

      case "autoAdvance": {
        const messageText = typeof message.payload === 'string' ? message.payload : "Advancing to next issue in queue...";
        toast.info(messageText, {
          duration: 2000,
        });
        break;
      }

      default:
        console.log("Unhandled message type:", message.type);
    }
  }, [ws]);

  const connect = useCallback(
    async (url: string, username: string, isHost: boolean) => {
      const websocket = new PokerWebSocket(url);

      await websocket.connect();

      // Set up a promise that resolves on successful join or rejects on error
      const joinPromise = new Promise<void>((resolve, reject) => {
        let joinErrorReceived = false;

        const joinMessageHandler = (message: Message) => {
          if (message.type === "joinError") {
            joinErrorReceived = true;
            reject(new Error(message.payload));
          } else if (!joinErrorReceived) {
            // Any other message means join was successful
            // Forward early messages (e.g., currentIssue) to the normal handler
            // so the UI reflects the current state even before the main handler attaches.
            try {
              handleMessage(message);
            } catch (e) {
              console.error("Error handling early join message", e);
            }
            resolve();
          }
        };

        // Temporarily listen for join result
        const cleanup = websocket.onMessage(joinMessageHandler);

        // Clean up after 5 seconds (timeout)
        setTimeout(() => {
          cleanup();
          if (!joinErrorReceived) {
            resolve(); // Assume success if no error received
          }
        }, 5000);
      });

      websocket.joinSession(username, isHost);

      // Wait for join to complete
      await joinPromise;

      // Now set up normal message handler
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
      queueItems: [],
    });
  }, [ws]);

  const addQueueItem = useCallback(
    (identifier: string, title: string, description?: string, index?: number) => {
      if (ws && gameState.isHost) {
        ws.sendQueueAdd(identifier, title, description, index);
      }
    },
    [ws, gameState.isHost]
  );

  const updateQueueItem = useCallback(
    (id: string, identifier?: string, title?: string, description?: string) => {
      if (ws && gameState.isHost) {
        ws.sendQueueUpdate(id, identifier, title, description);
      }
    },
    [ws, gameState.isHost]
  );

  const deleteQueueItem = useCallback(
    (id: string) => {
      if (ws && gameState.isHost) {
        ws.sendQueueDelete(id);
      }
    },
    [ws, gameState.isHost]
  );

  const reorderQueue = useCallback(
    (itemIds: string[]) => {
      if (ws && gameState.isHost) {
        ws.sendQueueReorder(itemIds);
      }
    },
    [ws, gameState.isHost]
  );

  const assignEstimate = useCallback(() => {
    if (ws && gameState.isHost && gameState.revealed && gameState.linearIssue) {
      ws.sendAssignEstimate();
    }
  }, [ws, gameState.isHost, gameState.revealed, gameState.linearIssue]);

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
    addQueueItem,
    updateQueueItem,
    deleteQueueItem,
    reorderQueue,
    assignEstimate,
  };

  return <PokerContext.Provider value={value}>{children}</PokerContext.Provider>;
};

