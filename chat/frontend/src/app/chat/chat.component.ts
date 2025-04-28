import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef, ViewChild, ElementRef, ApplicationRef } from "@angular/core";
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
  sentMessageIds: Set<string> = new Set(); // Track sent message IDs

  @ViewChild('chatMessages', { static: false }) chatMessagesContainer!: ElementRef<HTMLDivElement>;

  private messageSubscription: Subscription = new Subscription();
  private historySubscription: Subscription = new Subscription();
  private connectionStatusSubscription: Subscription = new Subscription();

  constructor(
    private websocketService: WebsocketService,
    private fb: FormBuilder,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private appRef: ApplicationRef // Add ApplicationRef for triggering change detection
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
    // Subscribe to connection status
    this.connectionStatusSubscription = this.websocketService
      .getConnectionStatus()
      .subscribe((status) => {
        this.zone.run(() => {
          this.connectionStatus = status;
          this.cdr.detectChanges();
        });
      });
  }

  login(): void {
    if (this.usernameForm.valid) {
      this.username = this.usernameForm.value.username;
      this.errorMessage = "";
      this.messages = []; // Clear messages on new login
      
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
                  // Connection success is handled by the status subscription
                } else if (message.type === "error") {
                  this.errorMessage = message.message || "Unknown error";
                  this.cdr.detectChanges();
                } else if (
                  message.type === "chat" ||
                  message.type === "system"
                ) {
                  // Check if this is a message we sent (avoid duplicates)
                  if (message.id && this.sentMessageIds.has(message.id)) {
                    console.log("Skipping already displayed message:", message.id);
                    return;
                  }
                  
                  // Add the message to our list
                  this.messages.push(message);
                  
                  // Force change detection
                  this.cdr.detectChanges();
                  
                  // Also force a global change detection cycle
                  this.appRef.tick();
                  
                  // Scroll to bottom
                  setTimeout(() => this.scrollToBottom(), 10);
                }
              });
            },
            error: (err) => {
              console.error("Message subscription error:", err);
              this.zone.run(() => {
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
                  // Replace the messages array with history
                  this.messages = [...history];
                  
                  // Force change detection
                  this.cdr.detectChanges();
                  
                  // Also force a global change detection cycle
                  this.appRef.tick();
                  
                  // Scroll after loading history
                  setTimeout(() => this.scrollToBottom(), 100);
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
        this.errorMessage = "Failed to connect to chat server";
      }
    }
  }

  sendMessage(): void {
    if (this.chatForm.valid && this.websocketService.isConnected()) {
      const message = this.chatForm.value.message;
      
      // Send the message and get the ID
      const messageId = this.websocketService.sendMessage(this.username, message);
      
      if (messageId) {
        // Track the message ID to avoid duplicates
        this.sentMessageIds.add(messageId);
        
        // Optimistically add the message to the UI
        this.messages.push({
          id: messageId,
          username: this.username,
          message: message,
          timestamp: new Date(),
          type: 'chat'
        });
        
        this.chatForm.reset();
        
        // Force change detection
        this.cdr.detectChanges();
        
        // Scroll to bottom
        setTimeout(() => this.scrollToBottom(), 10);
      }
    } else if (!this.websocketService.isConnected()) {
      this.errorMessage = "Cannot send message: not connected to server";
    }
  }

  reconnect(): void {
    if (this.username) {
      this.errorMessage = "";
      this.websocketService.disconnect();
      this.websocketService.connect(this.username);
    }
  }

  scrollToBottom(): void {
    if (this.chatMessagesContainer) {
      const container = this.chatMessagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  ngOnDestroy(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.historySubscription) {
      this.historySubscription.unsubscribe();
    }
    if (this.connectionStatusSubscription) {
      this.connectionStatusSubscription.unsubscribe();
    }
    this.websocketService.disconnect();
  }
}
