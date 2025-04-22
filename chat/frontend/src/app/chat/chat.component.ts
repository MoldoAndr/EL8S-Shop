// src/app/chat/chat.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
} from "@angular/core";
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

  private messageSubscription: Subscription = new Subscription();
  private historySubscription: Subscription = new Subscription();

  constructor(
    private websocketService: WebsocketService,
    private fb: FormBuilder,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
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

              // Run inside Angular zone to ensure UI updates
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
                  // Add the message to our list
                  this.messages.push(message);
                  // Force change detection
                  this.cdr.detectChanges();
                  // Scroll to bottom after a small delay to allow rendering
                  setTimeout(() => this.scrollToBottom(), 50);
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
                  this.messages = history;
                  this.cdr.detectChanges();
                  setTimeout(() => this.scrollToBottom(), 50);
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

  sendMessage(): void {
    if (this.chatForm.valid && this.websocketService.isConnected()) {
      const message = this.chatForm.value.message;
      this.websocketService.sendMessage(this.username, message);
      this.chatForm.reset();

      // Optionally add the message to the UI immediately for better responsiveness
      // This can create duplicates if you don't handle it carefully
      // this.messages.push({
      //   username: this.username,
      //   message: message,
      //   timestamp: new Date(),
      //   type: 'chat'
      // });
      // this.cdr.detectChanges();
      // this.scrollToBottom();
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
    const chatContainer = document.querySelector(".chat-messages");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
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
