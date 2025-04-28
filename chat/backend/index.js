const WebSocket = require('ws');
const { MongoClient } = require('mongodb');
const retry = require('async-retry');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  wsPort: process.env.PORT_WS || 88,
  mongoUrl: process.env.MONGO_URI || 'mongodb://mongodb:27017/chatapp',
  debug: process.env.DEBUG === 'true' || true,
  mongoRetry: {
    retries: 5,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 5000,
  },
};

// State
let wss;
let mongoClient;
let db;
let clients = new Map(); // Map to track clients and their usernames

// Enhanced debugging
function log(...args) {
  if (CONFIG.debug) {
    console.log(`${new Date().toISOString()}`, ...args);
  }
}

function error(...args) {
  console.error(`${new Date().toISOString()}`, ...args);
}

// Connect to MongoDB with retry
async function connectToMongoDB() {
  log('Attempting to connect to MongoDB at:', CONFIG.mongoUrl);
  await retry(
    async () => {
      mongoClient = new MongoClient(CONFIG.mongoUrl);
      await mongoClient.connect();
      db = mongoClient.db('chatapp');
      log('Successfully connected to MongoDB');
    },
    {
      retries: CONFIG.mongoRetry.retries,
      factor: CONFIG.mongoRetry.factor,
      minTimeout: CONFIG.mongoRetry.minTimeout,
      maxTimeout: CONFIG.mongoRetry.maxTimeout,
      onRetry: (err, attempt) => {
        error(`MongoDB connection attempt ${attempt} failed:`, err.message);
      },
    }
  ).catch((err) => {
    error('Failed to connect to MongoDB after retries:', err);
    process.exit(1); // Exit if connection cannot be established
  });
}

// Generate a unique message ID
function generateMessageId() {
  return `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

// Initialize WebSocket server
function initializeWebSocketServer() {
  wss = new WebSocket.Server({ port: CONFIG.wsPort });
  log(`WebSocket server running on port ${CONFIG.wsPort}`);

  wss.on('connection', async (ws) => {
    log('New WebSocket client connected');
    
    // Add a client ID
    const clientId = crypto.randomBytes(8).toString('hex');
    ws.id = clientId;

    try {
      // Ensure database is connected
      if (!db) {
        throw new Error('Database connection not established');
      }

      // Send message history
      const history = await db.collection('messages').find().sort({ timestamp: 1 }).toArray();
      log(`Sending message history (${history.length} messages) to client`);
      
      // Ensure all history messages have IDs
      const historyWithIds = history.map(msg => ({
        ...msg,
        id: msg.id || generateMessageId()
      }));
      
      ws.send(JSON.stringify({ type: 'history', data: historyWithIds }));

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connect_success',
        message: 'Successfully connected to chat server',
      }));
    } catch (err) {
      error('Error on connection handling:', err.message);
      ws.send(JSON.stringify({
        type: 'error',
        message: `Failed to initialize connection: ${err.message}`,
      }));
      ws.close(); // Close connection on critical error
      return;
    }

    ws.on('message', async (data) => {
      log('Received raw message:', data.toString());

      try {
        let parsedMsg;
        try {
          parsedMsg = JSON.parse(data);
        } catch (err) {
          throw new Error('Invalid JSON format');
        }

        // Validate message structure
        if (!parsedMsg || typeof parsedMsg !== 'object') {
          throw new Error('Message must be a valid object');
        }

        // Handle different message types
        if (parsedMsg.type === 'connect') {
          if (!parsedMsg.username || typeof parsedMsg.username !== 'string' || !isAscii(parsedMsg.username)) {
            throw new Error('Invalid or non-ASCII username');
          }
          
          // Store client username
          clients.set(ws.id, parsedMsg.username);
          
          log(`User ${parsedMsg.username} connected (client ID: ${ws.id})`);
          
          // Create system message for new user
          const systemMsg = {
            id: generateMessageId(),
            type: 'system',
            message: `${parsedMsg.username} has joined the chat`,
            timestamp: new Date(),
          };
          
          // Save system message to database
          await db.collection('messages').insertOne(systemMsg);
          
          // Broadcast user joined message
          broadcastMessage(systemMsg);
          
        } else if (parsedMsg.type === 'chat' || (!parsedMsg.type && parsedMsg.username && parsedMsg.message)) {
          // Validate chat message
          if (!parsedMsg.username || typeof parsedMsg.username !== 'string' || !isAscii(parsedMsg.username)) {
            throw new Error('Invalid or non-ASCII username');
          }
          if (!parsedMsg.message || typeof parsedMsg.message !== 'string' || !isAscii(parsedMsg.message)) {
            throw new Error('Invalid or non-ASCII message content');
          }

          log(`Chat message from ${parsedMsg.username}: ${parsedMsg.message}`);
          
          // Ensure the message has an ID (use client-provided or generate new one)
          const messageId = parsedMsg.id || generateMessageId();
          
          const msgDoc = {
            id: messageId,
            username: parsedMsg.username,
            message: parsedMsg.message,
            timestamp: new Date(),
            type: 'chat',
          };

          // Save to MongoDB
          log('Saving message to database:', msgDoc);
          const result = await db.collection('messages').insertOne(msgDoc);
          log('Database save result:', result);

          // Broadcast to all clients
          broadcastMessage(msgDoc);
        } else {
          throw new Error('Unknown message type');
        }
      } catch (err) {
        error('Error processing message:', err.message);
        ws.send(JSON.stringify({
          type: 'error',
          message: `Error processing message: ${err.message}`,
        }));
      }
    });

    ws.on('close', () => {
      log(`WebSocket client disconnected (client ID: ${ws.id})`);
      
      // Get username if available
      const username = clients.get(ws.id);
      
      // Remove from clients map
      clients.delete(ws.id);
      
      // If we had a username, broadcast disconnect message
      if (username) {
        const systemMsg = {
          id: generateMessageId(),
          type: 'system',
          message: `${username} has left the chat`,
          timestamp: new Date(),
        };
        
        // Save system message to database
        db.collection('messages').insertOne(systemMsg)
          .then(() => {
            // Broadcast user left message
            broadcastMessage(systemMsg);
          })
          .catch(err => {
            error('Error saving disconnect message:', err.message);
          });
      }
    });

    ws.on('error', (err) => {
      error('WebSocket error:', err.message);
    });
  });

  wss.on('error', (err) => {
    error('WebSocket server error:', err.message);
  });
}

// Broadcast message to all connected clients
function broadcastMessage(message) {
  if (!wss) {
    log('Cannot broadcast: WebSocket server not initialized');
    return;
  }
  
  const clientCount = wss.clients.size;
  log(`Broadcasting message to ${clientCount} clients:`, message);
  
  if (clientCount === 0) {
    log('No connected clients to broadcast to');
    return;
  }
  
  let sentCount = 0;
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        sentCount++;
      } catch (err) {
        error('Error broadcasting to client:', err.message);
      }
    }
  });
  
  log(`Successfully sent message to ${sentCount}/${clientCount} clients`);
}

// ASCII validation
function isAscii(str) {
  return /^[\x00-\x7F]*$/.test(str);
}

// Graceful shutdown
async function shutdown() {
  log('Shutting down server...');
  try {
    // Close WebSocket server
    if (wss) {
      wss.close(() => {
        log('WebSocket server closed');
      });
    }

    // Close MongoDB connection
    if (mongoClient) {
      await mongoClient.close();
      log('MongoDB connection closed');
    }
  } catch (err) {
    error('Error during shutdown:', err.message);
  } finally {
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the application
async function start() {
  try {
    await connectToMongoDB();
    initializeWebSocketServer();
    
    // Log readiness
    log('Chat server is fully initialized and ready to accept connections');
  } catch (err) {
    error('Failed to start application:', err.message);
    process.exit(1);
  }
}

// Perform a MongoDB health check every minute
setInterval(async () => {
  try {
    if (db) {
      await db.command({ ping: 1 });
      log('MongoDB health check: OK');
    }
  } catch (err) {
    error('MongoDB health check failed:', err.message);
    // Try to reconnect
    connectToMongoDB().catch(err => {
      error('Failed to reconnect to MongoDB:', err.message);
    });
  }
}, 60000);

start();
