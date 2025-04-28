import { Injectable } from "@angular/core";
import { Observable, Subject, BehaviorSubject } from "rxjs";

export interface Message {
  username?: string;
  message: string;
  timestamp?: Date;
  type?: string;
  data?: any;
  id?: string; 
}

@Injectable({
  providedIn: "root",
})
export class WebsocketService {
  private websocket!: WebSocket;
  private messages: Subject<Message> = new Subject<Message>();
  private connectionStatus = new BehaviorSubject<string>("disconnected");
  private connectionAttempts = 0;
  private maxRetries = 5; // Increased from 3
  private messageHistory: Message[] = [];
  
  // Endpoint options to try in sequence if connection fails
  private wsEndpoints = [
    "/ws",         // Standard endpoint from Ingress
    "/chat/ws",    // Alternative path
    "//localhost/ws"  // Direct to localhost
  ];
  private currentEndpointIndex = 0;

  connect(username: string): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log("Already connected, disconnecting first");
      this.disconnect();
    }
    
    // Get the current host
    const currentHost = window.location.host;
    
    // Determine protocol (ws or wss)
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    
    // Try the current endpoint
    const endpoint = this.wsEndpoints[this.currentEndpointIndex];
    
    // Build the complete URL
    let wsUrl: string;
    if (endpoint.startsWith("//")) {
      // Use as is for direct connection
      wsUrl = `${wsProtocol}:${endpoint}`;
    } else {
      // Construct relative URL
      wsUrl = `${wsProtocol}://${currentHost}${endpoint}`;
    }
    
    console.log(`Connecting to WebSocket at ${wsUrl} (attempt ${this.connectionAttempts + 1}, endpoint ${this.currentEndpointIndex + 1}/${this.wsEndpoints.length})`);
    
    this.connectionStatus.next("connecting");
    
    try {
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log("WebSocket connected successfully");
        // Reset connection attempts and endpoint index on successful connection
        this.connectionAttempts = 0;
        this.currentEndpointIndex = 0;
        this.connectionStatus.next("connected");
        
        // Notify user of successful connection
        this.messages.next({
          type: "system",
          message: "Connected to chat server",
          id: this.generateMessageId(),
          timestamp: new Date()
        });

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
          
          // Try the next endpoint when we reach a certain number of attempts
          if (this.connectionAttempts % 2 === 0) {
            this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.wsEndpoints.length;
          }
          
          console.log(
            `Attempting to reconnect (${this.connectionAttempts}/${this.maxRetries})...`,
          );

          // Exponential backoff with a maximum timeout
          const timeout = Math.min(
            1000 * Math.pow(1.5, this.connectionAttempts),
            10000,
          );
          setTimeout(() => this.connect(username), timeout);
        } else if (this.connectionAttempts >= this.maxRetries) {
          this.messages.next({
            type: "error",
            message:
              "Failed to connect after multiple attempts. Please check your network connection and try again later.",
            id: this.generateMessageId(),
            timestamp: new Date()
          });
          this.connectionStatus.next("error");
          
          // Show detailed error information for debugging
          this.messages.next({
            type: "error",
            message: `Debug info: Attempted ${this.connectionAttempts} times across ${this.wsEndpoints.length} endpoints. Last endpoint: ${this.wsEndpoints[this.currentEndpointIndex]}`,
            id: this.generateMessageId(),
            timestamp: new Date()
          });
        }
      };

      this.websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.connectionStatus.next("error");
        
        // Let onclose handle reconnection logic
      };
    } catch (err) {
      console.error("Error creating WebSocket:", err);
      this.connectionStatus.next("error");
      this.messages.next({
        type: "error",
        message: `WebSocket connection error: ${err}`,
        id: this.generateMessageId(),
        timestamp: new Date()
      });
      
      // Trigger reconnection
      this.connectionAttempts++;
      if (this.connectionAttempts < this.maxRetries) {
        const timeout = Math.min(
          1000 * Math.pow(1.5, this.connectionAttempts),
          10000,
        );
        setTimeout(() => this.connect(username), timeout);
      }
    }
  }

  sendMessage(username: string, message: string): string | null {
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
        id: this.generateMessageId(),
        timestamp: new Date()
      });
      
      // Try to reconnect automatically
      if (this.connectionStatus.value !== "connecting") {
        this.connect(username);
      }
      
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
