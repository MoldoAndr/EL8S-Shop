// Emergency direct fix for chat component
import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef, ViewChild, ElementRef } from "@angular/core";
import { WebsocketService, Message } from "../services/websocket.service";
import { Subscription } from "rxjs";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-chat",
  templateUrl: "./chat.component.html",
  styleUrls: ["./chat.component.css"],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
})
export class ChatComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  chatForm: FormGroup;
  username: string = "";
  usernameForm: FormGroup;
  isLoggedIn: boolean = false;
  connectionStatus: string = "disconnected";
  errorMessage: string = "";
  isSending: boolean = false;
  
  // Simple dictionary to track message IDs with timestamps for deduplication
  private processedMessages: {[key: string]: number} = {};

  @ViewChild('chatMessages', { static: false }) chatMessagesContainer!: ElementRef<HTMLDivElement>;

  private messageSubscription: Subscription = new Subscription();
  private historySubscription: Subscription = new Subscription();

  constructor(
    private websocketService: WebsocketService,
    private fb: FormBuilder,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.chatForm = this.fb.group({
      message: ["", Validators.required],
    });

    this.usernameForm = this.fb.group({
      username: [
        "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
        ],
      ],
    });
  }

  ngOnInit(): void {
    // Nothing to do here until login
  }

  login(): void {
    if (this.usernameForm.valid) {
      this.username = this.usernameForm.value.username;
      this.connectionStatus = "connecting";
      this.errorMessage = "";

      try {
        this.websocketService.connect(this.username);

        // Subscribe to messages (real-time updates)
        this.messageSubscription = this.websocketService
          .getMessages()
          .subscribe({
            next: (message: Message) => {
              console.log("Message received in component:", message);

              this.zone.run(() => {
                if (message.type === "connect_success") {
                  this.connectionStatus = "connected";
                } else if (message.type === "error") {
                  this.errorMessage = message.message || "Unknown error";
                  this.connectionStatus = "error";
                } else if (
                  message.type === "chat" ||
                  message.type === "message" ||
                  message.type === "system"
                ) {
                  // CRITICAL FIX: Check if this is a duplicate message
                  if (this.isDuplicate(message)) {
                    console.log("DUPLICATE DETECTED - SKIPPING MESSAGE:", message);
                    return;
                  }
                  
                  // Not a duplicate, add it to the list
                  this.messages.push(message);
                  this.cdr.detectChanges();
                  this.scrollToBottom();
                }
              });
            },
            error: (err) => {
              console.error("Message subscription error:", err);
              this.zone.run(() => {
                this.connectionStatus = "error";
                this.errorMessage = "Failed to receive messages";
                this.cdr.detectChanges();
              });
            },
          });

        // Subscribe to history (initial load)
        this.historySubscription = this.websocketService
          .getHistory()
          .subscribe({
            next: (history: Message[]) => {
              console.log("History received:", history);
              if (history && history.length > 0) {
                this.zone.run(() => {
                  this.messages = [];
                  this.processedMessages = {}; // Reset processed messages
                  
                  // Add each history message with deduplication
                  history.forEach(msg => {
                    if (!this.isDuplicate(msg)) {
                      this.messages.push(msg);
                    }
                  });
                  
                  this.cdr.detectChanges();
                  this.scrollToBottom();
                });
              }
            },
            error: (err) => {
              console.error("History subscription error:", err);
              this.zone.run(() => {
                this.errorMessage = "Failed to load message history";
                this.cdr.detectChanges();
              });
            },
          });

        this.isLoggedIn = true;
      } catch (err) {
        console.error("Login error:", err);
        this.connectionStatus = "error";
        this.errorMessage = "Failed to connect to chat server";
      }
    }
  }

  // SIMPLIFIED and DIRECT approach for deduplication
  private isDuplicate(message: any): boolean {
    // Get the ID with MongoDB _id compatibility
    let msgId = '';
    
    // First try MongoDB _id (this is what shows in your logs)
    if (message._id) {
      msgId = message._id.toString();
    } 
    // Then try regular id
    else if (message.id) {
      msgId = message.id.toString();
    }
    
    // If no ID, create a content-based ID
    if (!msgId && message.username && message.message && message.timestamp) {
      msgId = `${message.username}:${message.message}:${message.timestamp}`;
    }
    
    // No way to identify this message
    if (!msgId) {
      return false;
    }
    
    // Check if we've seen this message in the last 5 seconds
    const now = Date.now();
    if (this.processedMessages[msgId] && now - this.processedMessages[msgId] < 5000) {
      console.log(`DUPLICATE: Message ID ${msgId} was seen ${now - this.processedMessages[msgId]}ms ago`);
      return true;
    }
    
    // Not a duplicate, record it
    this.processedMessages[msgId] = now;
    
    // Clean up old entries every 100 messages to prevent memory leaks
    if (Object.keys(this.processedMessages).length > 100) {
      const cutoff = now - 60000; // 1 minute
      for (const id in this.processedMessages) {
        if (this.processedMessages[id] < cutoff) {
          delete this.processedMessages[id];
        }
      }
    }
    
    return false;
  }

  sendMessage(): void {
    if (this.chatForm.valid && this.websocketService.isConnected() && !this.isSending) {
      const message = this.chatForm.value.message;
      this.isSending = true;
      
      // Send message (WebsocketService will handle it)
      this.websocketService.sendMessage(this.username, message);
      
      // Clear the form
      this.chatForm.reset();
      
      // Reset sending flag after a delay
      setTimeout(() => {
        this.isSending = false;
      }, 500);
      
    } else if (!this.websocketService.isConnected()) {
      this.errorMessage = "Cannot send message: not connected to server";
      this.connectionStatus = "error";
    }
  }

  reconnect(): void {
    if (this.username) {
      this.connectionStatus = "connecting";
      this.errorMessage = "";
      this.websocketService.disconnect();
      this.websocketService.connect(this.username);
    }
  }

  scrollToBottom(): void {
    if (this.chatMessagesContainer) {
      const container = this.chatMessagesContainer.nativeElement;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  ngOnDestroy(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.historySubscription) {
      this.historySubscription.unsubscribe();
    }
    this.websocketService.disconnect();
  }
}
