// src/app/chat/chat.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { WebsocketService, Message } from '../services/websocket.service';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html', 
  styleUrls: ['./chat.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class ChatComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  chatForm: FormGroup;
  username: string = '';
  usernameForm: FormGroup;
  isLoggedIn: boolean = false;
  connectionStatus: string = 'disconnected';
  errorMessage: string = '';

  private messageSubscription: Subscription = new Subscription();
  private historySubscription: Subscription = new Subscription();

  constructor(
    private websocketService: WebsocketService,
    private fb: FormBuilder
  ) {
    this.chatForm = this.fb.group({
      message: ['', Validators.required]
    });

    this.usernameForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]]
    });
  }

  ngOnInit(): void {
  }

  login(): void {
    if (this.usernameForm.valid) {
      this.username = this.usernameForm.value.username;
      this.connectionStatus = 'connecting';
      this.errorMessage = '';
      
      try {
        this.websocketService.connect(this.username);
        this.messageSubscription = this.websocketService.getMessages()
        .subscribe({
          next: (message: Message) => {
            console.log('Message received in component:', message);
            
            if (message.type === 'connect_success') {
              this.connectionStatus = 'connected';
            } else if (message.type === 'error') {
              this.errorMessage = message.message || 'Unknown error';
              this.connectionStatus = 'error';
            } else if (message.type === 'chat' || message.type === 'message') {
              this.messages.push(message);
              setTimeout(() => this.scrollToBottom(), 50);
            }
          },
          error: (err) => {
            console.error('Message subscription error:', err);
            this.connectionStatus = 'error';
            this.errorMessage = 'Failed to receive messages';
          }
        });
        this.historySubscription = this.websocketService.getHistory()
          .subscribe({
            next: (history: Message[]) => {
              console.log('History received:', history);
              if (history && history.length > 0) {
                this.messages = history;
                setTimeout(() => this.scrollToBottom(), 50);
              }
            },
            error: (err) => {
              console.error('History subscription error:', err);
              this.errorMessage = 'Failed to load message history';
            }
          });
          
        this.isLoggedIn = true;
      } catch (err) {
        console.error('Login error:', err);
        this.connectionStatus = 'error';
        this.errorMessage = 'Failed to connect to chat server';
      }
    }
  }

  sendMessage(): void {
    if (this.chatForm.valid && this.websocketService.isConnected()) {
      const message = this.chatForm.value.message;
      this.websocketService.sendMessage(this.username, message);
      this.chatForm.reset();
    } else if (!this.websocketService.isConnected()) {
      this.errorMessage = 'Cannot send message: not connected to server';
      this.connectionStatus = 'error';
    }
  }

  reconnect(): void {
    if (this.username) {
      this.connectionStatus = 'connecting';
      this.errorMessage = '';
      this.websocketService.disconnect();
      this.websocketService.connect(this.username);
    }
  }

  scrollToBottom(): void {
    const chatContainer = document.querySelector('.chat-messages');
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
