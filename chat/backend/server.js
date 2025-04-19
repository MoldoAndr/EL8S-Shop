// server.js - Serverul de chat WebSocket
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Configurare Express
const app = express();
app.use(cors());
app.use(express.json());

// Servește fișierele statice din Angular
app.use(express.static(path.join(__dirname, 'public')));

// Crearea serverului HTTP
const server = http.createServer(app);

// Configurarea serverului WebSocket
const wss = new WebSocket.Server({ server });

// Conectare la MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Conectat la MongoDB');
}).catch(err => {
  console.error('Eroare conectare MongoDB:', err);
});

// Definirea schemei pentru mesaje
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Endpoint pentru obținerea istoricului de mesaje
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Eroare la obținerea mesajelor' });
  }
});

// Rută pentru toate celelalte cereri, servește aplicația Angular
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Funcția pentru broadcast mesaje către toți clienții conectați
function broadcastMessage(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Gestionarea conexiunilor WebSocket
wss.on('connection', (ws) => {
  console.log('Client conectat');
  
  // Trimite istoric mesaje la conectare
  Message.find().sort({ timestamp: 1 })
    .then(messages => {
      ws.send(JSON.stringify({ type: 'history', messages }));
    })
    .catch(err => console.error('Eroare la trimiterea istoricului:', err));
  
  // Ascultă pentru mesaje noi de la client
  ws.on('message', async (data) => {
    try {
      const receivedData = JSON.parse(data);
      
      if (receivedData.type === 'chat') {
        const { username, message } = receivedData;
        
        // Crează un nou document de mesaj
        const newMessage = new Message({
          username,
          message,
          timestamp: new Date()
        });
        
        // Salvează în baza de date
        await newMessage.save();
        
        // Trimite mesajul către toți clienții
        broadcastMessage({
          type: 'message',
          message: {
            username,
            message,
            timestamp: newMessage.timestamp
          }
        });
      }
    } catch (error) {
      console.error('Eroare procesare mesaj:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Client deconectat');
  });
});

// Pornire server
const PORT_WS = process.env.PORT_WS || 88;
const PORT_HTTP = process.env.PORT_HTTP || 90;

// Pornește serverul WebSocket pe portul 88
server.listen(PORT_WS, () => {
  console.log(`Serverul de WebSocket rulează pe portul ${PORT_WS}`);
});

// Pornește serverul HTTP pentru frontend pe portul 90
const httpServer = app.listen(PORT_HTTP, () => {
  console.log(`Serverul HTTP pentru frontend rulează pe portul ${PORT_HTTP}`);
});
