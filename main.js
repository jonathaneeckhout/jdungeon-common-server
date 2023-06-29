const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');

var database = require("./src/database");
var ws_handler = require("./src/wshandler")

const WEBSOCKET_PORT = 4433;

// Init the database connection
database.init();

// Load SSL/TLS certificate and key
const serverOptions = {
    cert: fs.readFileSync('data/certs/X509_certificate.crt'),
    key: fs.readFileSync('data/certs/X509_key.key')
};

// Create an HTTPS server
const server = https.createServer(serverOptions);

// Create a WebSocket server using the HTTPS server
const wss = new WebSocket.Server({ server });

// Init the Websocket handler
ws_handler.init(database);

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
    console.log('New client connected');
    ws_handler.handle_client_connected(ws);

    // Handle incoming messages from the client
    ws.on('message', (message) => {
        ws_handler.handle_client_message(ws, message);

    });

    // Handle WebSocket connection close
    ws.on('close', () => {
        console.log('Client disconnected');
        ws_handler.handle_client_disconnected(ws);
    });
});

// Start the HTTPS server
server.listen(WEBSOCKET_PORT, () => {
    console.log('Secure WebSocket server listening on port', WEBSOCKET_PORT);
});