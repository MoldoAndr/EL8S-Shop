export interface AudioFile {
  fileId: string;
  fileName: string;
  blobUrl: string;
  uploadTime: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  resultText?: string;
  targetLanguage: string;
}
