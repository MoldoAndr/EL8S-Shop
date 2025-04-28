// Save this as test-websocket.js
// Run with: node test-websocket.js

const WebSocket = require('ws');

// Configuration - change these values to match your environment
const TARGET_WS_URL = 'ws://localhost/ws'; // The WebSocket URL to test
const USERNAME = 'tester'; // Test username
const TEST_MESSAGE = 'Hello, testing WebSocket connectivity!'; // Test message
const CONNECTION_TIMEOUT = 10000; // 10 seconds timeout

console.log(`Testing WebSocket connection to ${TARGET_WS_URL}...`);

let connectionSuccessful = false;
let messageReceived = false;

const ws = new WebSocket(TARGET_WS_URL);

ws.on('open', () => {
  connectionSuccessful = true;
  console.log('✅ Successfully connected to WebSocket server');
  
  // Send connect message
  console.log(`Sending connect message for user "${USERNAME}"...`);
  ws.send(JSON.stringify({
    type: 'connect',
    username: USERNAME
  }));
  
  // Wait a moment then send a test chat message
  setTimeout(() => {
    console.log(`Sending test chat message: "${TEST_MESSAGE}"`);
    ws.send(JSON.stringify({
      type: 'chat',
      username: USERNAME,
      message: TEST_MESSAGE
    }));
  }, 1000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📩 Received message:', message);
    
    // Check if we received the history
    if (message.type === 'history') {
      console.log(`✅ Received ${message.data?.length || 0} history messages`);
    }
    
    // Check if we received our own message back
    if (message.type === 'chat' && message.username === USERNAME && message.message === TEST_MESSAGE) {
      messageReceived = true;
      console.log('✅ Successfully received our test message back');
      
      // Test complete, close connection
      console.log('Test completed successfully! Closing connection...');
      ws.close();
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`WebSocket connection closed. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
  
  // Final test results
  console.log('\n--- TEST RESULTS ---');
  console.log(`Connection established: ${connectionSuccessful ? '✅ YES' : '❌ NO'}`);
  console.log(`Message exchange successful: ${messageReceived ? '✅ YES' : '❌ NO'}`);
  
  if (connectionSuccessful && messageReceived) {
    console.log('\n✅ WEBSOCKET TEST PASSED: Your WebSocket connection is working properly!');
  } else {
    console.log('\n❌ WEBSOCKET TEST FAILED: There are issues with your WebSocket connection.');
  }
});

// Set a timeout to avoid hanging if connection fails
setTimeout(() => {
  if (!connectionSuccessful) {
    console.error('❌ Connection timeout - could not connect to WebSocket server');
    console.log('\n--- TROUBLESHOOTING TIPS ---');
    console.log('1. Check if the WebSocket server is running');
    console.log('2. Verify the WebSocket URL is correct');
    console.log('3. Ensure there are no firewall or network issues');
    console.log('4. Check if the proxy configuration is correct');
    console.log('5. Look at server logs for connection attempts');
    process.exit(1);
  }
}, CONNECTION_TIMEOUT);
