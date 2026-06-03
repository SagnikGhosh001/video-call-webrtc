import type { ClientMessage, ServerMessage } from "./types";

export class SignalingClient {
  private ws: WebSocket | null = null;
  private messageHandler: ((msg: ServerMessage) => void) | null = null;
  private closeHandler: (() => void) | null = null;

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("WebSocket connection failed"));

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          this.messageHandler?.(msg);
        } catch {
          console.error("Failed to parse signaling message", event.data);
        }
      };

      ws.onclose = () => {
        this.closeHandler?.();
      };
    });
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(handler: (msg: ServerMessage) => void): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
