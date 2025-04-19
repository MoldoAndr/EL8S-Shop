const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Import Azure services
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 89;

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    const filetypes = /wav|mp3|ogg|m4a|flac/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only audio files are allowed!'));
  }
});

// SQL Database Configuration
const sqlConfig = {
  user: process.env.DB_USER || 'YOUR_DB_USER',
  password: process.env.DB_PASSWORD || 'YOUR_DB_PASSWORD',
  server: process.env.DB_SERVER || 'YOUR_DB_SERVER',
  database: process.env.DB_NAME || 'YOUR_DB_NAME',
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// Azure Blob Storage Configuration
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerName = 'audio-files';

// Initialize Azure resources
async function initializeAzureResources() {
  try {
    // Create container if it doesn't exist
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const createContainerResponse = await containerClient.createIfNotExists();
    console.log(`Container created: ${createContainerResponse.succeeded}`);
    
    // Test SQL connection
    await sql.connect(sqlConfig);
    console.log('Connected to SQL Database');
  } catch (error) {
    console.error('Error initializing Azure resources:', error);
  }
}

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Service is running' });
});

// Upload file route
app.post('/api/upload', upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = uuidv4();
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const targetLanguage = req.body.targetLanguage || 'en-US';
    
    // Upload to blob storage
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(`${fileId}${path.extname(fileName)}`);
    
    const uploadBlobResponse = await blockBlobClient.uploadFile(filePath);
    console.log(`File uploaded with response: ${uploadBlobResponse.requestId}`);
    
    // Save metadata to SQL
    await sql.connect(sqlConfig);
    const result = await sql.query`
      INSERT INTO FileProcessing (FileId, FileName, BlobUrl, UploadTime, Status, TargetLanguage)
      VALUES (${fileId}, ${fileName}, ${blockBlobClient.url}, ${new Date()}, 'Pending', ${targetLanguage})
    `;
    
    // Start async processing
    processAudioFile(fileId, filePath, targetLanguage);
    
    res.status(200).json({
      fileId,
      message: 'File uploaded successfully. Processing started.',
      status: 'Pending'
    });
    
    // Delete local file after upload
    fs.unlinkSync(filePath);
    
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'File upload failed', details: error.message });
  }
});

// Get all processed files
app.get('/api/files', async (req, res) => {
  try {
    await sql.connect(sqlConfig);
    const result = await sql.query`
      SELECT FileId, FileName, BlobUrl, UploadTime, Status, ResultText, TargetLanguage
      FROM FileProcessing
      ORDER BY UploadTime DESC
    `;
    
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to retrieve files', details: error.message });
  }
});

// Get file by ID
app.get('/api/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    await sql.connect(sqlConfig);
    const result = await sql.query`
      SELECT FileId, FileName, BlobUrl, UploadTime, Status, ResultText, TargetLanguage
      FROM FileProcessing
      WHERE FileId = ${fileId}
    `;
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to retrieve file', details: error.message });
  }
});

// Process audio file using Azure Speech Translation
async function processAudioFile(fileId, filePath, targetLanguage) {
  try {
    // Update status to Processing
    await sql.connect(sqlConfig);
    await sql.query`
      UPDATE FileProcessing
      SET Status = 'Processing'
      WHERE FileId = ${fileId}
    `;
    
    // Configure speech translation
    const speechConfig = sdk.SpeechTranslationConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION
    );
    
    // The source language is auto-detected
    speechConfig.addTargetLanguage(targetLanguage);
    
    const audioConfig = sdk.AudioConfig.fromWavFileInput(filePath);
    const recognizer = new sdk.TranslationRecognizer(speechConfig, audioConfig);
    
    let translatedText = '';
    
    // Start recognition
    recognizer.recognizeOnceAsync(
      async (result) => {
        if (result.reason === sdk.ResultReason.TranslatedSpeech) {
          translatedText = result.translations.get(targetLanguage);
          console.log(`Translation successful: ${translatedText}`);
          
          // Update database with results
          await sql.connect(sqlConfig);
          await sql.query`
            UPDATE FileProcessing
            SET Status = 'Completed', ResultText = ${translatedText}
            WHERE FileId = ${fileId}
          `;
        } else {
          console.error(`Translation failed: ${result.reason}`);
          
          // Update database with failure
          await sql.connect(sqlConfig);
          await sql.query`
            UPDATE FileProcessing
            SET Status = 'Failed', ResultText = ${`Error: ${result.reason}`}
            WHERE FileId = ${fileId}
          `;
        }
        
        recognizer.close();
      },
      (err) => {
        console.error(`Error during translation: ${err}`);
        
        // Update database with error
        sql.connect(sqlConfig).then(() => {
          sql.query`
            UPDATE FileProcessing
            SET Status = 'Failed', ResultText = ${`Error: ${err}`}
            WHERE FileId = ${fileId}
          `;
        });
        
        recognizer.close();
      }
    );
  } catch (error) {
    console.error('Error processing audio file:', error);
    
    // Update database with error
    try {
      await sql.connect(sqlConfig);
      await sql.query`
        UPDATE FileProcessing
        SET Status = 'Failed', ResultText = ${`Error: ${error.message}`}
        WHERE FileId = ${fileId}
      `;
    } catch (dbError) {
      console.error('Error updating database:', dbError);
    }
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeAzureResources();
});
