import { Component } from '@angular/core';
import { UploadComponent } from './components/upload/upload.component';
import { FileHistoryComponent } from './components/file-history/file-history.component';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1>Speech Translation Service</h1>
      </header>
      
      <main class="app-content">
        <app-upload></app-upload>
        <app-file-history></app-file-history>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .app-header {
      background-color:rgb(16, 29, 49);
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 2rem;
      text-align: center;
    }
    
    .app-header h1 {
      margin: 0;
      font-size: 1.75rem;
    }
    
    .app-content {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }
    
    @media (min-width: 768px) {
      .app-content {
        grid-template-columns: 1fr 1fr;
      }
    }
  `],
  imports: [UploadComponent, FileHistoryComponent],
  standalone: true
})
export class AppComponent {
  title = 'Speech Translation Service';
}
