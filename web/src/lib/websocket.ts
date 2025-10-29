import {
  MessageType,
  type Message,
  type JoinMessage,
  type IssueConfirmPayload,
  type QueueAddPayload,
  type QueueUpdatePayload,
  type QueueDeletePayload,
  type QueueReorderPayload,
} from "../types/poker";

export type MessageHandler = (message: Message) => void;
export type ReconnectHandler = () => void;
export type DisconnectHandler = () => void;

export class PokerWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectHandlers: Set<ReconnectHandler> = new Set();
  private disconnectHandlers: Set<DisconnectHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private shouldReconnect = true;
  private pendingReconnect: number | null = null;
  private isReconnecting = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    // Clear any pending reconnect attempts
    if (this.pendingReconnect) {
      clearTimeout(this.pendingReconnect);
      this.pendingReconnect = null;
    }

    return new Promise((resolve, reject) => {
      // Add connection timeout (10 seconds)
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.error("WebSocket connection timeout");
          this.ws.close();
          reject(new Error("Connection timeout - server did not respond"));
        }
      }, 10000);

      try {
        // Close existing connection if any
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log("Closing existing connection before reconnecting");
          this.ws.close();
        }

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          clearTimeout(connectionTimeout);
          
          this.reconnectAttempts = 0;
          
          // Notify reconnect handlers if this was a reconnection
          if (this.isReconnecting) {
            console.log("Notifying reconnect handlers...");
            this.reconnectHandlers.forEach((handler) => handler());
            this.isReconnecting = false;
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: Message = JSON.parse(event.data);
            this.messageHandlers.forEach((handler) => handler(message));
          } catch (error) {
            console.error("Error parsing message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          clearTimeout(connectionTimeout);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket closed", event.code, event.reason);
          clearTimeout(connectionTimeout);
          
          // Always notify disconnect handlers immediately on close
          // The UI should reflect the actual connection state
          this.disconnectHandlers.forEach((handler) => handler());
          
          // Check if we should auto-reconnect for unexpected closures (not normal closures)
          const shouldAttemptReconnect = this.shouldReconnect && 
              this.reconnectAttempts < this.maxReconnectAttempts &&
              event.code !== 1000; // 1000 is normal closure
          
          if (shouldAttemptReconnect) {
            this.isReconnecting = true;
            this.pendingReconnect = setTimeout(() => {
              this.reconnectAttempts++;
              console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
              this.connect().catch((err) => {
                console.error("Reconnection failed:", err);
                this.isReconnecting = false;
              });
            }, this.reconnectDelay);
          }
        };
      } catch (error) {
        clearTimeout(connectionTimeout);
        reject(error);
      }
    });
  }

  disconnect() {
    this.shouldReconnect = false;
    
    // Clear any pending reconnect attempts
    if (this.pendingReconnect) {
      clearTimeout(this.pendingReconnect);
      this.pendingReconnect = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onReconnect(handler: ReconnectHandler) {
    this.reconnectHandlers.add(handler);
    return () => {
      this.reconnectHandlers.delete(handler);
    };
  }

  onDisconnect(handler: DisconnectHandler) {
    this.disconnectHandlers.add(handler);
    return () => {
      this.disconnectHandlers.delete(handler);
    };
  }

  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
    }
  }

  // Client actions
  joinSession(username: string, isHost: boolean) {
    const message: JoinMessage = {
      type: MessageType.Join,
      payload: {
        username,
        isHost,
      },
    };
    this.send(message);
  }

  sendEstimate(points: number) {
    this.send({
      type: MessageType.Estimate,
      payload: points.toString(),
    });
  }

  revealRound() {
    this.send({
      type: MessageType.Reveal,
      payload: "",
    });
  }

  resetBoard() {
    this.send({
      type: MessageType.Reset,
      payload: "",
    });
  }

  sendIssueConfirm(identifier: string, queueIndex: number, isCustom: boolean) {
    const payload: IssueConfirmPayload = {
      requestId: this.generateRequestId(),
      identifier,
      queueIndex,
      isCustom,
    };
    this.send({
      type: MessageType.IssueConfirm,
      payload,
    });
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Queue management methods
  sendQueueAdd(identifier: string, title: string, description?: string, index?: number) {
    const payload: QueueAddPayload = {
      identifier,
      title,
      description,
      index,
    };
    this.send({
      type: MessageType.QueueAdd,
      payload,
    });
  }

  sendQueueUpdate(id: string, identifier?: string, title?: string, description?: string) {
    const payload: QueueUpdatePayload = {
      id,
      identifier,
      title,
      description,
    };
    this.send({
      type: MessageType.QueueUpdate,
      payload,
    });
  }

  sendQueueDelete(id: string) {
    const payload: QueueDeletePayload = { id };
    this.send({
      type: MessageType.QueueDelete,
      payload,
    });
  }

  sendQueueReorder(itemIds: string[]) {
    const payload: QueueReorderPayload = { itemIds };
    this.send({
      type: MessageType.QueueReorder,
      payload,
    });
  }

  sendAssignEstimate() {
    this.send({
      type: MessageType.AssignEstimate,
      payload: "",
    });
  }
}

