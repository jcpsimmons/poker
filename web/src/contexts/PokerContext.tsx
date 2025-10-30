import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { PokerWebSocket } from "../lib/websocket";
import type {
  GameState,
  Message,
} from "../types/poker";
import { messageHandlers } from "../lib/messageHandlers";
import { useMetrics, type ComputedMetrics } from "../hooks/useMetrics";
import { logActivity, type ActivityEntry } from "../lib/activityLogger";

interface PokerContextType {
  gameState: GameState;
  ws: PokerWebSocket | null;
  activities: ActivityEntry[];
  computedMetrics: ComputedMetrics;
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
  onAutoReconnectFailed?: (error: string) => void;
}

export const PokerProvider: React.FC<PokerProviderProps> = ({ children, onAutoReconnectFailed }) => {
  const [ws, setWs] = useState<PokerWebSocket | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  // Use refs to access latest state and ws in setTimeout callbacks
  const gameStateRef = useRef<GameState | null>(null);
  const wsRef = useRef<PokerWebSocket | null>(null);
  const reconnectAttempted = useRef(false); // Prevent multiple reconnect attempts
  const { metrics, startConnection, trackReconnect, trackMessage, startRound, computeMetrics } = useMetrics();
  const [computedMetrics, setComputedMetrics] = useState<ComputedMetrics>(() => 
    computeMetrics([], 1)
  );
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
        voters: [],
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
      voters: [],
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

  // Update computed metrics whenever game state or metrics change
  useEffect(() => {
    const interval = setInterval(() => {
      setComputedMetrics(computeMetrics(gameState.votes, gameState.roundNumber));
    }, 1000);
    // Also update immediately
    setComputedMetrics(computeMetrics(gameState.votes, gameState.roundNumber));
    return () => clearInterval(interval);
  }, [computeMetrics, gameState.votes, gameState.roundNumber, metrics]);

  const handleMessage = useCallback((message: Message) => {
    const isDev = import.meta.env.DEV;
    
    if (isDev) {
      console.log("Received message:", message);
    }

    // Track message for metrics
    trackMessage();

    // Log activities based on message type
    const currentState = gameStateRef.current || gameState;
    switch (message.type) {
      case "voteStatus": {
        // Check if someone voted (new vote in the list)
        const payload = typeof message.payload === 'string' 
          ? JSON.parse(message.payload) 
          : message.payload;
        if (payload?.voters) {
          const newVoters = payload.voters.filter((v: any) => v.hasVoted);
          const prevVoters = currentState.voters || [];
          newVoters.forEach((voter: any) => {
            // Only log if this voter wasn't in the previous state or wasn't voted before
            const prevVoter = prevVoters.find((v) => v.username === voter.username);
            if (!prevVoter || !prevVoter.hasVoted) {
              setActivities((prev) => {
                const updated = [...prev, logActivity("VOTE", `${voter.username} submitted estimate`)];
                return updated.slice(-100);
              });
            }
          });
        }
        break;
      }
      case "revealData":
        setActivities((prev) => {
          const updated = [...prev, logActivity("REVEAL", "all votes disclosed")];
          return updated.slice(-100);
        });
        break;
      case "clearBoard":
        const avg = currentState.averagePoints !== "0" ? currentState.averagePoints : "N/A";
        setActivities((prev) => {
          const updated = [...prev, logActivity("RESET", `round completed, avg=${avg}`)];
          return updated.slice(-100);
        });
        startRound(); // Track new round start
        break;
      case "currentIssue":
        if (currentState.roundNumber > 1) {
          setActivities((prev) => {
            const updated = [...prev, logActivity("ROUND_START", `round ${currentState.roundNumber}`)];
            return updated.slice(-100);
          });
        }
        break;
      case "issueLoaded": {
        const payload = typeof message.payload === 'string' 
          ? JSON.parse(message.payload) 
          : message.payload;
        if (payload?.title) {
          setActivities((prev) => {
            const updated = [...prev, logActivity("ISSUE_LOADED", payload.title)];
            return updated.slice(-100);
          });
        }
        break;
      }
      case "queueSync":
        // Don't log every queueSync as it's too frequent
        break;
      case "participantCount": {
        const prevCount = currentState.participants;
        const newCount = typeof message.payload === 'string' 
          ? parseInt(message.payload, 10) 
          : message.payload;
        if (typeof newCount === 'number' && newCount > prevCount) {
          setActivities((prev) => {
            const updated = [...prev, logActivity("CONNECT", `participant count: ${newCount}`)];
            return updated.slice(-100);
          });
        } else if (typeof newCount === 'number' && newCount < prevCount) {
          setActivities((prev) => {
            const updated = [...prev, logActivity("DISCONNECT", `participant count: ${newCount}`)];
            return updated.slice(-100);
          });
        }
        break;
      }
    }

    // Find handler for this message type
    const handler = messageHandlers[message.type];

    if (!handler) {
      console.log("Unhandled message type:", message.type);
      return;
    }

    try {
      // Call handler with payload and current state, passing refs for async operations
      const stateUpdate = handler(message.payload, gameState, {
        wsRef,
        gameStateRef,
      });

      // If handler returned a state update, merge it with current state
      if (stateUpdate) {
        setGameState((prev) => ({ ...prev, ...stateUpdate }));

        if (isDev) {
          console.log(`[${message.type}] State update:`, stateUpdate);
        }
      }
    } catch (error) {
      console.error(`Error handling message type ${message.type}:`, error);
    }
  }, [gameState, wsRef, gameStateRef, trackMessage, startRound]);

  const connect = useCallback(
    async (url: string, username: string, isHost: boolean) => {
      const websocket = new PokerWebSocket(url);

      await websocket.connect();

      // Set connected state immediately after WebSocket opens
      setWs(websocket);
      startConnection();
      setActivities((prev) => {
        const updated = [...prev, logActivity("CONNECT", `${username} joined session`)];
        return updated.slice(-100);
      });
      setGameState((prev) => ({
        ...prev,
        connected: true,
        username,
        isHost,
      }));

      // Update UI when connection drops
      websocket.onDisconnect(() => {
        console.log("WebSocket disconnected, updating UI...");
        setActivities((prev) => {
          const updated = [...prev, logActivity("DISCONNECT", "connection lost")];
          return updated.slice(-100);
        });
        setGameState((prev) => ({ ...prev, connected: false }));
      });

      // Re-join session when WebSocket reconnects automatically
      websocket.onReconnect(() => {
        console.log("WebSocket reconnected, re-joining session...");
        trackReconnect();
        setActivities((prev) => {
          const updated = [...prev, logActivity("CONNECT", "connection restored")];
          return updated.slice(-100);
        });
        websocket.joinSession(username, isHost);
        setGameState((prev) => ({ ...prev, connected: true }));
      });

      // Set up a promise that resolves on successful join or rejects on error
      const joinPromise = new Promise<void>((resolve, reject) => {
        let joinErrorReceived = false;

        const joinMessageHandler = (message: Message) => {
          if (message.type === "joinError") {
            joinErrorReceived = true;
            // Disconnect and clean up on join error
            websocket.disconnect();
            setWs(null);
            setGameState((prev) => ({ ...prev, connected: false }));
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

      // Save active session to localStorage
      localStorage.setItem('poker_active_session', 'true');
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
    
    // Clear all localStorage keys related to poker session
    localStorage.removeItem('poker_active_session');
    localStorage.removeItem('poker_username');
    localStorage.removeItem('poker_server_url');
    localStorage.removeItem('poker_is_host');
    localStorage.removeItem('poker_session_start');
    
    // Reset game state to initial
    setGameState({
      connected: false,
      username: "",
      isHost: false,
      currentIssue: "Waiting for host to set issue...",
      currentIssueId: "",
      participants: 0,
      votes: [],
      voters: [],
      revealed: false,
      averagePoints: "0",
      roundNumber: 1,
      queueItems: [],
    });
    
    // Clear activities
    setActivities([]);
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
    // Prevent multiple reconnect attempts (React Strict Mode can cause double renders)
    if (reconnectAttempted.current) {
      console.log("Reconnect already attempted, skipping");
      return;
    }
    
    const hasActiveSession = localStorage.getItem('poker_active_session') === 'true';
    const savedUsername = localStorage.getItem('poker_username');
    const savedServerUrl = localStorage.getItem('poker_server_url');
    const savedIsHost = localStorage.getItem('poker_is_host') === 'true';

    if (hasActiveSession && savedUsername && savedServerUrl && !ws) {
      console.log("Attempting to reconnect to previous session...");
      reconnectAttempted.current = true;
      
      connect(savedServerUrl, savedUsername, savedIsHost).catch((error) => {
        console.error("Failed to reconnect:", error);
        
        // Don't clear localStorage here - it would trigger storage events in other tabs
        // and kick them out too! Just clear the active session flag.
        localStorage.removeItem('poker_active_session');
        // Keep username/url/host in localStorage so user can retry with different name
        
        // Notify parent component about the failure
        if (onAutoReconnectFailed) {
          const errorMessage = error instanceof Error ? error.message : "Failed to reconnect to session";
          onAutoReconnectFailed(errorMessage);
        }
      });
    }
    // Only run on mount - don't include connect/ws in deps to avoid re-running
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync connected state with actual WebSocket connection
  useEffect(() => {
    if (!ws) return;

    // Periodically check if the actual connection state matches our state
    const checkConnection = setInterval(() => {
      const actuallyConnected = ws.isConnected();
      if (actuallyConnected !== gameState.connected) {
        console.log(`Connection state mismatch! Actual: ${actuallyConnected}, State: ${gameState.connected}`);
        setGameState((prev) => ({ ...prev, connected: actuallyConnected }));
      }
    }, 1000);

    return () => clearInterval(checkConnection);
  }, [ws, gameState.connected]);

  // Cleanup when ws changes or on unmount
  useEffect(() => {
    // Return cleanup function that closes the current ws instance
    const currentWs = ws;
    return () => {
      if (currentWs) {
        currentWs.disconnect();
      }
    };
  }, [ws]);

  const value: PokerContextType = {
    gameState,
    ws,
    activities,
    computedMetrics,
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

