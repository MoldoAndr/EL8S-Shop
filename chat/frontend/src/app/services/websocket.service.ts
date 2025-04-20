import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface Message {
  username?: string; // Made optional
  message: string;
  timestamp?: Date; // Made optional
  type?: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private websocket!: WebSocket;
  private messages: Subject<Message> = new Subject<Message>();
  private connectionAttempts = 0;
  private maxRetries = 3;

  connect(username: string): void {
   	const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
	const wsUrl = `${wsProtocol}://${window.location.host}/ws`;
	console.log(`Connecting to WebSocket at ${wsUrl}`);

    console.log('Attempting to connect to WebSocket at:', wsUrl);
    
    this.websocket = new WebSocket(wsUrl);
    
    this.websocket.onopen = () => {
      console.log('WebSocket connected successfully');
      // Reset connection attempts on successful connection
      this.connectionAttempts = 0;
      
      // Send connect message with username to identify the user
      this.websocket.send(JSON.stringify({ 
        type: 'connect', 
        username: username 
      }));
    };
    
    this.websocket.onmessage = (event) => {
      try {
        console.log('WebSocket message received:', event.data);
        const data = JSON.parse(event.data);
        this.messages.next(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.websocket.onclose = (event) => {
      console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}, Clean: ${event.wasClean}`);
      
      // Try to reconnect if not a clean close and within retry limits
      if (!event.wasClean && this.connectionAttempts < this.maxRetries) {
        this.connectionAttempts++;
        console.log(`Attempting to reconnect (${this.connectionAttempts}/${this.maxRetries})...`);
        
        // Exponential backoff
        const timeout = Math.min(1000 * Math.pow(2, this.connectionAttempts), 10000);
        setTimeout(() => this.connect(username), timeout);
      } else if (this.connectionAttempts >= this.maxRetries) {
        this.messages.next({ 
          type: 'error', 
          message: 'Failed to connect after multiple attempts. Please try again later.' 
        });
      }
    };
    
    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.messages.next({ 
        type: 'error', 
        message: 'WebSocket connection error' 
      });
    };
  }
  
  sendMessage(username: string, message: string): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log('Sending message:', message);
      this.websocket.send(JSON.stringify({ 
        type: 'chat',
        username: username, 
        message: message
      }));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
      this.messages.next({ 
        type: 'error', 
        message: 'Cannot send message: not connected to chat server' 
      });
    }
  }
  
  getMessages(): Observable<Message> {
    return this.messages.asObservable();
  }
  
  getHistory(): Observable<Message[]> {
    return new Observable(observer => {
      const subscription = this.messages.subscribe(msg => {
        if (msg.type === 'history') {
          console.log('Received history:', msg.data || msg.message);
          observer.next(msg.data || msg.message || []);
        }
      });
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }
  
  disconnect(): void {
    if (this.websocket) {
      console.log('Disconnecting WebSocket');
      this.websocket.close();
    }
  }
  
  isConnected(): boolean {
    return this.websocket && this.websocket.readyState === WebSocket.OPEN;
  }
}
