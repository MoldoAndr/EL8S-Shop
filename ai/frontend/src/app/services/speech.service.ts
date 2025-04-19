import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AudioFile } from '../models/audio-file.model';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  /**
   * Upload an audio file for translation
   * @param formData The form data containing the audio file and target language
   * @returns Promise with the upload response
   */
  async uploadAudio(formData: FormData): Promise<{ fileId: string; message: string; status: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error;
    }
  }

  /**
   * Get all processed files
   * @returns Promise with array of audio files
   */
  async getFiles(): Promise<AudioFile[]> {
    try {
      const response = await fetch(`${this.apiUrl}/files`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }

  /**
   * Get a single file by ID
   * @param fileId The ID of the file to retrieve
   * @returns Promise with the audio file details
   */
  async getFileById(fileId: string): Promise<AudioFile> {
    try {
      const response = await fetch(`${this.apiUrl}/files/${fileId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch file');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching file:', error);
      throw error;
    }
  }
}
