// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../environments/environment';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

// Models
interface TranslationFile {
  Id: number;
  FileId?: string;
  FileName: string;
  BlobUrl: string;
  TimeStamp: string;
  TranslationResult: string;
  Status?: string;
  TargetLanguage?: string;
}

interface Language {
  code: string;
  name: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ]
})
export class AppComponent implements OnInit {
  // API endpoint
  private apiUrl = environment.apiUrl;
  
  // Upload properties
  selectedAudioFile: File | null = null;
  targetLanguage: string = 'en-US';
  isUploading: boolean = false;
  uploadSuccess: boolean = false;
  uploadError: string = '';
  
  // History properties
  files: TranslationFile[] = [];
  selectedTranslationFile: TranslationFile | null = null;
  loading: boolean = true;
  error: string = '';
  
  // Language options
  languages: Language[] = [
    { code: 'en-US', name: 'English' },
    { code: 'fr-FR', name: 'French' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ru-RU', name: 'Russian' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' }
  ];
  
  constructor(private http: HttpClient) {}
  
  ngOnInit(): void {
    this.loadFiles();
    
    // Set up auto-refresh for file status changes
    setInterval(() => {
      if (this.selectedTranslationFile) {
        this.refreshFileDetails(this.selectedTranslationFile.Id);
      } else {
        this.loadFiles(false);
      }
    }, 10000); // Refresh every 10 seconds
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedAudioFile = input.files[0];
    }
  }
  
  uploadFile(): void {
    if (!this.selectedAudioFile) {
      this.uploadError = 'Please select a file to upload';
      return;
    }
    
    this.isUploading = true;
    this.uploadError = '';
    this.uploadSuccess = false;
    
    const formData = new FormData();
    formData.append('audioFile', this.selectedAudioFile);
    formData.append('targetLanguage', this.targetLanguage);
    
    this.http.post(`${this.apiUrl}/upload`, formData)
      .pipe(
        catchError(this.handleError)
      )
      .subscribe({
        next: (response) => {
          console.log('Upload success', response);
          this.uploadSuccess = true;
          this.selectedAudioFile = null;
          // Reset file input by clearing value
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          
          // Load files to show the new upload
          setTimeout(() => this.loadFiles(), 1000);
        },
        error: (error) => {
          console.error('Upload error', error);
          this.uploadError = error.message || 'An error occurred during upload';
          this.isUploading = false;
        },
        complete: () => {
          this.isUploading = false;
        }
      });
  }
  
  loadFiles(showLoading = true): void {
    if (showLoading) {
      this.loading = true;
    }
    this.error = '';
    
    this.http.get<TranslationFile[]>(`${this.apiUrl}/files`)
      .pipe(
        catchError(this.handleError)
      )
      .subscribe({
        next: (data) => {
          // Sort by timestamp (newest first)
          this.files = data.sort((a, b) => 
            new Date(b.TimeStamp).getTime() - new Date(a.TimeStamp).getTime()
          );
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading files', err);
          this.error = err.message || 'Failed to load translation history';
          this.loading = false;
        }
      });
  }
  
  refreshFileDetails(id: number): void {
    this.http.get<TranslationFile>(`${this.apiUrl}/files/${id}`)
      .pipe(
        catchError(this.handleError)
      )
      .subscribe({
        next: (data) => {
          this.selectedTranslationFile = data;
        },
        error: (err) => {
          console.error('Error refreshing file details', err);
        }
      });
  }
  
  selectFile(file: TranslationFile): void {
    this.selectedTranslationFile = file;
    this.refreshFileDetails(file.Id);
  }
  
  backToList(): void {
    this.selectedTranslationFile = null;
    this.loadFiles(); // Refresh the list when going back
  }
  
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
  
  getStatus(result: string): string {
    if (!result) return 'Pending';
    if (result === 'Pending') return 'Pending';
    if (result === 'Processing') return 'Processing';
    if (result.toLowerCase().includes('error')) return 'Failed';
    return 'Completed';
  }
  
  getStatusBadgeClass(result: string): string {
    const status = this.getStatus(result);
    
    switch (status) {
      case 'Completed':
        return 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-800';
      case 'Processing':
        return 'px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800';
      case 'Pending':
        return 'px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800';
      case 'Failed':
        return 'px-2 py-1 text-xs rounded-full bg-red-100 text-red-800';
      default:
        return 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800';
    }
  }
  
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      // Handle specific status codes
      if (error.status === 0) {
        errorMessage = 'Cannot connect to the server. Please check your connection or try again later.';
      } else if (error.status === 404) {
        errorMessage = 'The requested resource was not found.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}