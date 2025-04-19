import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpeechService } from '../../services/speech.service';
import { AudioFile } from '../../models/audio-file.model';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-file-history',
  templateUrl: './file-history.component.html',
  styleUrls: ['./file-history.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class FileHistoryComponent implements OnInit, OnDestroy {
  files: AudioFile[] = [];
  isLoading = true;
  error = '';
  selectedFile: AudioFile | null = null;
  private refreshSubscription?: Subscription;

  constructor(private speechService: SpeechService) {}

  ngOnInit(): void {
    this.loadFiles();
    
    // Refresh every 10 seconds to check for status updates
    this.refreshSubscription = interval(10000).subscribe(() => {
      this.loadFiles(false);
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadFiles(showLoading = true): void {
    if (showLoading) {
      this.isLoading = true;
    }
    this.error = '';
    
    this.speechService.getFiles()
      .then(files => {
        this.files = files;
        this.isLoading = false;
        
        // Update selected file if it exists in the new list
        if (this.selectedFile) {
          const updatedFile = this.files.find(f => f.fileId === this.selectedFile?.fileId);
          if (updatedFile) {
            this.selectedFile = updatedFile;
          }
        }
      })
      .catch(err => {
        this.error = err.message || 'Failed to load file history';
        this.isLoading = false;
      });
  }

  viewFileDetails(file: AudioFile): void {
    this.selectedFile = file;
  }

  closeDetails(): void {
    this.selectedFile = null;
  }

  // Returns CSS class based on processing status
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'processing':
        return 'status-processing';
      case 'pending':
        return 'status-pending';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  }

  // Format the timestamp for display
  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }
}
