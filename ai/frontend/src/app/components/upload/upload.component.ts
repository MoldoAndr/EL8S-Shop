import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SpeechService } from '../../services/speech.service';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class UploadComponent {
  uploadForm: FormGroup;
  isUploading = false;
  uploadSuccess = false;
  uploadError = '';
  supportedLanguages = [
    { code: 'en-US', name: 'English' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ru-RU', name: 'Russian' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' }
  ];
  fileId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private speechService: SpeechService
  ) {
    this.uploadForm = this.fb.group({
      audioFile: [null, Validators.required],
      targetLanguage: ['en-US', Validators.required]
    });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      this.uploadForm.patchValue({ audioFile: file });
    }
  }

  async onSubmit() {
    if (this.uploadForm.invalid) {
      return;
    }

    this.isUploading = true;
    this.uploadSuccess = false;
    this.uploadError = '';
    this.fileId = null;

    try {
      const formData = new FormData();
      formData.append('audioFile', this.uploadForm.get('audioFile')?.value);
      formData.append('targetLanguage', this.uploadForm.get('targetLanguage')?.value);

      const response = await this.speechService.uploadAudio(formData);
      this.uploadSuccess = true;
      this.fileId = response.fileId;
      this.uploadForm.reset({ targetLanguage: 'en-US' });
    } catch (error: any) {
      this.uploadError = error.message || 'An error occurred during upload';
    } finally {
      this.isUploading = false;
    }
  }
}
