import {
  MessageType,
  type Message,
  type JoinMessage,
  type IssueConfirmPayload,
} from "../types/poker";

export type MessageHandler = (message: Message) => void;
export type ReconnectHandler = () => void;

export class PokerWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectHandlers: Set<ReconnectHandler> = new Set();
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
      try {
        // Close existing connection if any
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log("Closing existing connection before reconnecting");
          this.ws.close();
        }

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          
          // Notify reconnect handlers if this was a reconnection
          if (this.isReconnecting) {
            console.log("Notifying reconnect handlers...");
            this.reconnectHandlers.forEach((handler) => handler());
            this.isReconnecting = false;
          }
          
          this.reconnectAttempts = 0;
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
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket closed", event.code, event.reason);
          
          // Only auto-reconnect for unexpected closures (not normal closures)
          if (this.shouldReconnect && 
              this.reconnectAttempts < this.maxReconnectAttempts &&
              event.code !== 1000) { // 1000 is normal closure
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
}

