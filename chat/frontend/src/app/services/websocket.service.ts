import { Injectable } from "@angular/core";
import { Observable, Subject, BehaviorSubject } from "rxjs";

export interface Message {
  username?: string;
  message: string;
  timestamp?: Date;
  type?: string;
  data?: any;
  id?: string; // Add ID to track messages
}

@Injectable({
  providedIn: "root",
})
export class WebsocketService {
  private websocket!: WebSocket;
  private messages: Subject<Message> = new Subject<Message>();
  private connectionStatus = new BehaviorSubject<string>("disconnected");
  private connectionAttempts = 0;
  private maxRetries = 3;
  private messageHistory: Message[] = [];

  connect(username: string): void {
    // Get the current host
    const currentHost = window.location.host;

    // Determine protocol (ws or wss)
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";

    // Use relative path for WebSocket to work with any domain
const wsUrl = `ws://chat-backend:88/`;
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    
    // Close existing connection if any
    if (this.websocket) {
      this.websocket.close();
    }

    this.connectionStatus.next("connecting");
    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      console.log("WebSocket connected successfully");
      // Reset connection attempts on successful connection
      this.connectionAttempts = 0;
      this.connectionStatus.next("connected");

      // Send connect message with username to identify the user
      this.websocket.send(
        JSON.stringify({
          type: "connect",
          username: username,
        }),
      );
    };

    this.websocket.onmessage = (event) => {
      try {
        console.log("WebSocket message received:", event.data);
        const data = JSON.parse(event.data);
        
        // Add a unique ID to the message if it doesn't have one
        if (!data.id && (data.type === 'chat' || data.type === 'system')) {
          data.id = this.generateMessageId();
        }
        
        // Handle history differently
        if (data.type === 'history') {
          if (data.data && Array.isArray(data.data)) {
            // Add IDs to history messages if they don't have them
            this.messageHistory = data.data.map(msg => ({
              ...msg,
              id: msg.id || this.generateMessageId()
            }));
          }
        }
        
        // Emit the message to subscribers
        this.messages.next(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    this.websocket.onclose = (event) => {
      console.log(
        `WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || "No reason provided"}, Clean: ${event.wasClean}`,
      );

      this.connectionStatus.next("disconnected");

      // Try to reconnect if not a clean close and within retry limits
      if (!event.wasClean && this.connectionAttempts < this.maxRetries) {
        this.connectionAttempts++;
        console.log(
          `Attempting to reconnect (${this.connectionAttempts}/${this.maxRetries})...`,
        );

        // Exponential backoff
        const timeout = Math.min(
          1000 * Math.pow(2, this.connectionAttempts),
          10000,
        );
        setTimeout(() => this.connect(username), timeout);
      } else if (this.connectionAttempts >= this.maxRetries) {
        this.messages.next({
          type: "error",
          message:
            "Failed to connect after multiple attempts. Please try again later.",
        });
        this.connectionStatus.next("error");
      }
    };

    this.websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.connectionStatus.next("error");
      this.messages.next({
        type: "error",
        message: "WebSocket connection error",
      });
    };
  }

  sendMessage(username: string, message: string): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log("Sending message:", message);
      
      // Generate a message ID
      const messageId = this.generateMessageId();
      
      // Send message with ID
      this.websocket.send(
        JSON.stringify({
          type: "chat",
          username: username,
          message: message,
          id: messageId
        }),
      );
      
      return messageId;
    } else {
      console.warn("Cannot send message: WebSocket not connected");
      this.messages.next({
        type: "error",
        message: "Cannot send message: not connected to chat server",
      });
      return null;
    }
  }

  getMessages(): Observable<Message> {
    return this.messages.asObservable();
  }

  getConnectionStatus(): Observable<string> {
    return this.connectionStatus.asObservable();
  }

  getHistory(): Observable<Message[]> {
    return new Observable((observer) => {
      const subscription = this.messages.subscribe((msg) => {
        if (msg.type === "history") {
          console.log("Received history:", msg.data || msg.message);
          observer.next(this.messageHistory);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    });
  }

  disconnect(): void {
    if (this.websocket) {
      console.log("Disconnecting WebSocket");
      this.websocket.close();
      this.connectionStatus.next("disconnected");
    }
  }

  isConnected(): boolean {
    return this.websocket && this.websocket.readyState === WebSocket.OPEN;
  }
  
  // Generate a unique message ID
  private generateMessageId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}
