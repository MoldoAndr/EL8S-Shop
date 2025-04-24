import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../environments/environment';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

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
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ]
})
export class AppComponent implements OnInit {
  private apiUrl = environment.apiUrl; 
  
  selectedAudioFile: File | null = null;
  targetLanguage: string = 'en-US';
  isUploading: boolean = false;
  uploadSuccess: boolean = false;
  uploadError: string = '';
  
  files: TranslationFile[] = [];
  selectedTranslationFile: TranslationFile | null = null;
  loading: boolean = true;
  error: string = '';
  
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
    console.log('Using API URL:', this.apiUrl);
    
    this.loadFiles();
    
    setInterval(() => {
      if (this.selectedTranslationFile) {
        this.refreshFileDetails(this.selectedTranslationFile.Id);
      } else if (!this.isUploading) {
        this.loadFiles(false);
      }
    }, 10000);
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedAudioFile = input.files[0];
      console.log('File selected:', this.selectedAudioFile.name);
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
    
    console.log('Uploading file to:', `${this.apiUrl}/upload`);
    console.log('Target language:', this.targetLanguage);
    
    this.http.post(`${this.apiUrl}/upload`, formData)
      .pipe(
        catchError(this.handleError.bind(this))
      )
      .subscribe({
        next: (response) => {
          console.log('Upload success:', response);
          this.uploadSuccess = true;
          this.selectedAudioFile = null;
          
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          
          setTimeout(() => this.loadFiles(), 1000);
        },
        error: (error) => {
          console.error('Upload error:', error);
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
    
    console.log('Loading files from:', `${this.apiUrl}/files`);
    
    this.http.get<TranslationFile[]>(`${this.apiUrl}/files`)
      .pipe(
        catchError(this.handleError.bind(this))
      )
      .subscribe({
        next: (data) => {
          console.log('Files loaded:', data);
          this.files = data.sort((a, b) => 
            new Date(b.TimeStamp).getTime() - new Date(a.TimeStamp).getTime()
          );
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading files:', err);
          this.error = err.message || 'Failed to load translation history';
          this.loading = false;
        }
      });
  }
  
  refreshFileDetails(id: number): void {
    console.log('Refreshing file details for ID:', id);
    
    this.http.get<TranslationFile>(`${this.apiUrl}/files/${id}`)
      .pipe(
        catchError(this.handleError.bind(this))
      )
      .subscribe({
        next: (data) => {
          console.log('File details refreshed:', data);
          this.selectedTranslationFile = data;
        },
        error: (err) => {
          console.error('Error refreshing file details:', err);
        }
      });
  }
  
  selectFile(file: TranslationFile): void {
    console.log('Selected file:', file);
    this.selectedTranslationFile = file;
    this.refreshFileDetails(file.Id);
  }
  
  backToList(): void {
    this.selectedTranslationFile = null;
    this.loadFiles();
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
        return 'badge badge-completed';
      case 'Processing':
        return 'badge badge-processing';
      case 'Pending':
        return 'badge badge-pending';
      case 'Failed':
        return 'badge badge-failed';
      default:
        return 'badge';
    }
  }
  
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      console.error('HTTP Error:', error.status, error.message, error);
      
      if (error.status === 0) {
        errorMessage = `Cannot connect to the server at ${this.apiUrl}. Please check your connection or try again later.`;
      } else if (error.status === 404) {
        errorMessage = 'The requested resource was not found.';
      } else if (error.status === 500) {
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}