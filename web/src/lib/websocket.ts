import {
  MessageType,
  type Message,
  type JoinMessage,
  type IssueConfirmPayload,
} from "../types/poker";

export type MessageHandler = (message: Message) => void;

export class PokerWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private shouldReconnect = true;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
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

        this.ws.onclose = () => {
          console.log("WebSocket closed");
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
              this.connect();
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

