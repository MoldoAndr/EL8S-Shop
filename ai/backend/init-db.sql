-- Create FileProcessing table
CREATE TABLE FileProcessing (
    FileId NVARCHAR(36) PRIMARY KEY,
    FileName NVARCHAR(255) NOT NULL,
    BlobUrl NVARCHAR(1024) NOT NULL,
    UploadTime DATETIME NOT NULL,
    Status NVARCHAR(50) NOT NULL,
    ResultText NVARCHAR(MAX),
    TargetLanguage NVARCHAR(10) NOT NULL
);

-- Create index on status for efficient querying
CREATE INDEX idx_file_processing_status ON FileProcessing(Status);

-- Create index on upload time for sorting
CREATE INDEX idx_file_processing_upload_time ON FileProcessing(UploadTime DESC);

-- Sample query to get all files
-- SELECT FileId, FileName, BlobUrl, UploadTime, Status, ResultText, TargetLanguage
-- FROM FileProcessing
-- ORDER BY UploadTime DESC;

-- Sample query to get file by ID
-- SELECT FileId, FileName, BlobUrl, UploadTime, Status, ResultText, TargetLanguage
-- FROM FileProcessing
-- WHERE FileId = 'file-id-here';

-- Sample query to update status
-- UPDATE FileProcessing
-- SET Status = 'Completed', ResultText = 'Translated text here'
-- WHERE FileId = 'file-id-here';
