const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 89;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /wav|mp3|ogg|m4a|flac/;
    const mimetype = allowed.test(file.mimetype);
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    return mimetype && extname ? cb(null, true) : cb(new Error('Only audio files allowed'));
  }
});

const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerName = 'audio-files';

async function initializeAzureResources() {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    await sql.connect(sqlConfig);
    console.log('Azure resources initialized.');
  } catch (error) {
    console.error('Azure init error:', error);
  }
}

app.get('/api/health', (req, res) =>
  res.status(200).json({ status: 'ok', message: 'Service is running' })
);

app.post('/api/upload', upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    console.log("✅ Received upload request");
    
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const targetLanguage = req.body.targetLanguage || 'en-US';

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = `${Date.now()}-${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadFile(filePath);

    await sql.connect(sqlConfig);
    await sql.query`
      INSERT INTO RequestsHistory (FileName, BlobUrl, TimeStamp, TranslationResult)
      VALUES (${fileName}, ${blockBlobClient.url}, ${new Date()}, 'Pending')
    `;

    // Don't delete the file here, we'll delete it after processing is complete
    // Start processing in the background
    processAudioFile(filePath, blockBlobClient.url, targetLanguage);

    res.status(200).json({
      fileName,
      blobUrl: blockBlobClient.url,
      status: 'Pending',
      message: 'File uploaded. Processing started.'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    await sql.connect(sqlConfig);
    const result = await sql.query`
      SELECT Id, FileName, BlobUrl, TimeStamp, TranslationResult
      FROM RequestsHistory
      ORDER BY TimeStamp DESC
    `;
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files', details: error.message });
  }
});

app.get('/api/files/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await sql.connect(sqlConfig);
    const result = await sql.query`
      SELECT Id, FileName, BlobUrl, TimeStamp, TranslationResult
      FROM RequestsHistory
      WHERE Id = ${id}
    `;
    if (!result.recordset.length) return res.status(404).json({ error: 'File not found' });
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving file', details: error.message });
  }
});

async function processAudioFile(filePath, blobUrl, targetLanguage) {
  try {
    await sql.connect(sqlConfig);
    await sql.query`
      UPDATE RequestsHistory
      SET TranslationResult = 'Processing'
      WHERE BlobUrl = ${blobUrl}
    `;

    // Create speech config
    const speechConfig = sdk.SpeechTranslationConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION
    );
    
    // Set the source speech recognition language (required)
    speechConfig.speechRecognitionLanguage = "en-US"; // Assuming English is the source language
    
    // Configure target language
    speechConfig.addTargetLanguage(targetLanguage);
    
    // Use pushStream instead of direct file input
    const pushStream = sdk.AudioInputStream.createPushStream();
    
    // Read file in chunks and push to stream
    const fileBuffer = fs.readFileSync(filePath);
    pushStream.write(fileBuffer);
    pushStream.close();
    
    // Create audio config from push stream
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    
    // Create recognizer with the configs
    const recognizer = new sdk.TranslationRecognizer(speechConfig, audioConfig);

    recognizer.recognizeOnceAsync(
      async (result) => {
        const success = result.reason === sdk.ResultReason.TranslatedSpeech;
        const translation = success
          ? result.translations.get(targetLanguage)
          : `Error: ${result.reason}`;

        await sql.connect(sqlConfig);
        await sql.query`
          UPDATE RequestsHistory
          SET TranslationResult = ${translation}
          WHERE BlobUrl = ${blobUrl}
        `;
        recognizer.close();
        
        // Delete the file after processing is complete
        try {
          fs.unlinkSync(filePath);
          console.log(`File ${filePath} deleted successfully after processing`);
        } catch (deleteErr) {
          console.error(`Error deleting file ${filePath}:`, deleteErr);
        }
      },
      async (err) => {
        console.error('Recognition error:', err);
        await sql.connect(sqlConfig);
        await sql.query`
          UPDATE RequestsHistory
          SET TranslationResult = ${'Error: ' + err}
          WHERE BlobUrl = ${blobUrl}
        `;
        recognizer.close();
        
        // Delete the file even on error
        try {
          fs.unlinkSync(filePath);
          console.log(`File ${filePath} deleted successfully after error`);
        } catch (deleteErr) {
          console.error(`Error deleting file ${filePath}:`, deleteErr);
        }
      }
    );
  } catch (err) {
    console.error('Processing error:', err);
    await sql.connect(sqlConfig);
    await sql.query`
      UPDATE RequestsHistory
      SET TranslationResult = ${'Error: ' + err.message}
      WHERE BlobUrl = ${blobUrl}
    `;
    
    // Delete the file on processing setup error
    try {
      fs.unlinkSync(filePath);
      console.log(`File ${filePath} deleted successfully after processing error`);
    } catch (deleteErr) {
      console.error(`Error deleting file ${filePath}:`, deleteErr);
    }
  }
}

app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  await initializeAzureResources();
});