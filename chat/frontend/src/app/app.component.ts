// src/app/app.component.ts
import { Component } from '@angular/core';
import { ChatComponent } from './chat/chat.component';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <app-chat></app-chat>
    </div>
  `,
  styles: [`
    .app-container {
    padding: 20px;
    }
  `],
  imports: [ChatComponent],
  standalone: true
})
export class AppComponent {
  title = 'chat-client';
}
