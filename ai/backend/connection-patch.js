// Add robust connection handling to Azure SQL
function createRobustSqlConnection() {
  console.log('Attempting to connect to Azure SQL Database...');
  const maxRetries = 5;
  let retryCount = 0;
  
  function attemptConnection() {
    return sql.connect(sqlConfig)
      .then(() => {
        console.log('Successfully connected to Azure SQL Database!');
        return true;
      })
      .catch(err => {
        retryCount++;
        console.error(`Connection attempt ${retryCount} failed: ${err.message}`);
        
        if (retryCount < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          console.log(`Retrying in ${delay/1000} seconds...`);
          return new Promise(resolve => setTimeout(resolve, delay))
            .then(() => attemptConnection());
        } else {
          console.error(`Failed to connect after ${maxRetries} attempts. Using local fallback...`);
          // Set up a local in-memory store as fallback
          setupLocalFallback();
          return false;
        }
      });
  }
  
  return attemptConnection();
}

// Setup local fallback data store
function setupLocalFallback() {
  console.log('Setting up local in-memory fallback data store');
  global.localStore = {
    files: [],
    counter: 0,
    
    async addFile(fileName, blobUrl) {
      const id = ++this.counter;
      const record = {
        Id: id,
        FileName: fileName,
        BlobUrl: blobUrl,
        TimeStamp: new Date(),
        TranslationResult: 'Pending'
      };
      this.files.push(record);
      return id;
    },
    
    async updateFile(blobUrl, result) {
      const file = this.files.find(f => f.BlobUrl === blobUrl);
      if (file) {
        file.TranslationResult = result;
      }
    },
    
    async getFiles() {
      return [...this.files].sort((a, b) => 
        new Date(b.TimeStamp).getTime() - new Date(a.TimeStamp).getTime());
    },
    
    async getFileById(id) {
      return this.files.find(f => f.Id === id) || null;
    }
  };
}
