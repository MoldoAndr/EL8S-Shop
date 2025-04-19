# AI Speech Translation Service

This application allows users to upload audio files for automatic speech translation using Azure Cognitive Services. The service processes audio files, translates them to the selected target language, and stores the results.

## Architecture

The application consists of:

- **Angular Frontend**: User interface for uploading files and viewing translation history
- **Node.js Backend**: API for handling file uploads and Azure service integration
- **Azure Services**:
  - Azure Blob Storage for file storage
  - Azure SQL Database for metadata and results
  - Azure Speech Service for speech translation

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Azure subscription with:
  - Blob Storage account
  - SQL Database
  - Speech Service

### Environment Configuration

1. Copy the example environment file:
   ```
   cp backend/.env.example backend/.env
   ```

2. Update the `.env` file with your Azure credentials:
   - Storage connection string
   - SQL Database connection details
   - Speech Service key and region

### Running the Application

Start the application using Docker Compose:

```bash
docker-compose up
```

This will start both the frontend and backend services:
- Frontend: http://localhost:91
- Backend: http://localhost:89

## API Endpoints

- `POST /api/upload`: Upload an audio file for translation
- `GET /api/files`: Get all processed files
- `GET /api/files/:fileId`: Get details for a specific file
- `GET /api/health`: Check service health

## Database Schema

The SQL database uses a `FileProcessing` table with the following structure:

```sql
CREATE TABLE FileProcessing (
    FileId NVARCHAR(36) PRIMARY KEY,
    FileName NVARCHAR(255) NOT NULL,
    BlobUrl NVARCHAR(1024) NOT NULL,
    UploadTime DATETIME NOT NULL,
    Status NVARCHAR(50) NOT NULL,
    ResultText NVARCHAR(MAX),
    TargetLanguage NVARCHAR(10) NOT NULL
);
```

## Supported File Formats

- WAV
- MP3
- OGG
- M4A
- FLAC

Maximum file size: 50MB

## Supported Languages

The service supports translation to:
- English (en-US)
- Spanish (es-ES)
- French (fr-FR)
- German (de-DE)
- Italian (it-IT)
- Japanese (ja-JP)
- Korean (ko-KR)
- Portuguese (pt-BR)
- Russian (ru-RU)
- Chinese (zh-CN)
