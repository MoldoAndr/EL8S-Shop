const WebSocket = require('ws');
const MongoClient = require('mongodb').MongoClient;
const wss = new WebSocket.Server({ port: process.env.PORT_WS || 88 });
const mongoUrl = process.env.MONGO_URI || 'mongodb://mongodb:27017/chatapp';
let db;

// Enhanced debugging
const DEBUG = true;
function log(...args) {
  if (DEBUG) {
    console.log(new Date().toISOString(), ...args);
  }
}

// Connect to MongoDB
log('Attempting to connect to MongoDB at:', mongoUrl);
MongoClient.connect(mongoUrl, { useUnifiedTopology: true })
    .then(client => {
        db = client.db('chatapp');
        log('Successfully connected to MongoDB');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit if we can't connect to the database
    });

// WebSocket handling
wss.on('connection', async (ws) => {
    log('New WebSocket client connected');
    
    try {
        // Check if db is initialized
        if (!db) {
            log('WARNING: Database not yet connected, waiting 1 second...');
            // Wait a bit for DB connection
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (!db) {
                throw new Error('Database connection not established');
            }
        }
        
        // Send message history
        const history = await db.collection('messages').find().sort({ timestamp: 1 }).toArray();
        log(`Sending message history (${history.length} messages) to client`);
        ws.send(JSON.stringify({ type: 'history', data: history }));
        
        // Send connection confirmation
        ws.send(JSON.stringify({ 
            type: 'connect_success', 
            message: 'Successfully connected to chat server' 
        }));
    } catch (err) {
        console.error('Error on connection handling:', err);
        ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Failed to load chat history: ' + err.message 
        }));
    }

    ws.on('message', async (data) => {
        log('Received raw message:', data.toString());
        
        try {
            const parsedMsg = JSON.parse(data);
            log('Parsed message:', parsedMsg);
            
            // Handle different message types
            if (parsedMsg.type === 'connect') {
                log(`User ${parsedMsg.username} connected`);
                // Broadcast user connected message
                broadcastMessage({
                    type: 'system',
                    message: `${parsedMsg.username} has joined the chat`,
                    timestamp: new Date()
                });
            } 
            else if (parsedMsg.type === 'chat' || (!parsedMsg.type && parsedMsg.username && parsedMsg.message)) {
                // Handle both new format (with type) and old format (without type)
                log(`Chat message from ${parsedMsg.username}: ${parsedMsg.message}`);
                
                if (!parsedMsg.message || !parsedMsg.username) {
                    throw new Error('Message must include username and content');
                }
                
                if (!isAscii(parsedMsg.message)) {
                    throw new Error('Message must be ASCII');
                }
                
                const msgDoc = {
                    username: parsedMsg.username,
                    message: parsedMsg.message,
                    timestamp: new Date(),
                    type: 'chat'
                };
                
                // Save to MongoDB
                log('Saving message to database:', msgDoc);
                const result = await db.collection('messages').insertOne(msgDoc);
                log('Database save result:', result);
                
                // Broadcast to all clients
                broadcastMessage(msgDoc);
            }
        } catch (err) {
            console.error('Error processing message:', err);
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Error processing message: ' + err.message 
            }));
        }
    });
    
    ws.on('close', () => {
        log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Function to broadcast a message to all connected clients
function broadcastMessage(message) {
    log(`Broadcasting message to ${wss.clients.size} clients`);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// ASCII validation
function isAscii(str) {
    return /^[\x00-\x7F]*$/.test(str);
}

log(`WebSocket server running on port ${process.env.PORT_WS || 88}`);

// Handle process termination
process.on('SIGINT', () => {
    log('Shutting down server...');
    process.exit(0);
});