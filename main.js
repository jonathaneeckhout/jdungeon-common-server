const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');

const PORT = 4433;


// Load SSL/TLS certificate and key
const serverOptions = {
    cert: fs.readFileSync('data/certs/X509_certificate.crt'),
    key: fs.readFileSync('data/certs/X509_key.key')
};

// Create an HTTPS server
const server = https.createServer(serverOptions);

// Create a WebSocket server using the HTTPS server
const wss = new WebSocket.Server({ server });

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
    console.log('New client connected');

    // Handle incoming messages from the client
    ws.on('message', (message) => {
        parse_message(ws, JSON.parse(message.toString()))
    });

    // Handle WebSocket connection close
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

function parse_message(ws, message) {
    switch (message.type) {
        case "auth":
            handle_auth_message(ws, message.data)
            break;
        default:
            break;
    }
}

function handle_auth_message(ws, data) {
    //TODO: check if values are correct
    ws.send(JSON.stringify({
        "type": "auth-response",
        "error": false,
        "data": {
            "auth": true
        }
    }));

    //TODO: switch client to correct level server
    ws.send(JSON.stringify({
        "type": "switch-level",
        "error": false,
        "data": {
            "level": "Grassland",
            "address": "127.0.0.1",
            "port": 4434
        }
    }));
}

// Start the HTTPS server
server.listen(PORT, () => {
    console.log('Secure WebSocket server listening on port', PORT);
});