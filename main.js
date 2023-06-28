const { Pool } = require('pg');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = 4433;

const { DB_USER, DB_HOST, DB_PASSWORD } = process.env;

const pool = new Pool({
    user: DB_USER,
    host: DB_HOST,
    database: 'jdungeon',
    password: DB_PASSWORD,
    port: 5432, // default PostgreSQL port
});

// Load SSL/TLS certificate and key
const serverOptions = {
    cert: fs.readFileSync('data/certs/X509_certificate.crt'),
    key: fs.readFileSync('data/certs/X509_key.key')
};

// Create an HTTPS server
const server = https.createServer(serverOptions);

// Create a WebSocket server using the HTTPS server
const wss = new WebSocket.Server({ server });

var players = {};

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
    console.log('New client connected');

    players.ws = {
        ws: ws,
        username: "",
        logged_in: false,
        cookie: "",
        connected_time: Date.now()
    };

    // Handle incoming messages from the client
    ws.on('message', (message) => {
        // try {
        parse_message(ws, JSON.parse(message.toString()))
        // } catch (error) {
        //     ws.send(JSON.stringify({ error: true, reason: "api error" }));
        // }

    });

    // Handle WebSocket connection close
    ws.on('close', () => {
        console.log('Client disconnected');
        delete players.ws;
    });
});

function parse_message(ws, message) {
    switch (message.type) {
        case "auth":
            console.log(message)
            handle_auth_message(ws, message.args)
            break;
        default:
            break;
    }
}

function handle_auth_message(ws, args) {
    pool.query('SELECT * FROM players WHERE username = $1 AND password = $2', [args.username, args.password], (err, result) => {
        if (err) {
            console.error('Error executing query', err);
            ws.send(JSON.stringify({ error: true, reason: "api error" }));
        } else {
            var auth = (result.rowCount > 0);
            var cookie = auth ? uuidv4() : "";
            ws.send(JSON.stringify({
                "type": "auth-response",
                "error": false,
                "data": {
                    "auth": auth,
                    "cookie": cookie
                }
            }));
            if (auth) {
                players.ws.logged_in = true;
                players.ws.cookie = cookie

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
        }
    });
}

// Start the HTTPS server
server.listen(PORT, () => {
    console.log('Secure WebSocket server listening on port', PORT);
});