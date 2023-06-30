const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

var Database = require("./database");
var Players = require("./players");

const WEBSOCKET_PORT = 4433;

const LEVELS_INFO = { "Grassland": { "address": "127.0.0.1", "port": 4434 } };
const STARTER_LEVEL = "Grassland";
const STARTER_POS = { x: 128.0, y: 128.0 };

var database = Database.getInstance();
var players = Players.getInstance();

// Load SSL/TLS certificate and key
const serverOptions = {
    cert: fs.readFileSync('data/certs/ws/X509_certificate.crt'),
    key: fs.readFileSync('data/certs/ws/X509_key.key')
};

// Create an HTTPS server, this one is used for player's communication
const server = https.createServer(serverOptions);

// Create a WebSocket server using the HTTPS server
const wss = new WebSocket.Server({ server });

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
    console.log('New client connected');
    handle_client_connected(ws);

    // Handle incoming messages from the client
    ws.on('message', (message) => {
        handle_client_message(ws, message);

    });

    // Handle WebSocket connection close
    ws.on('close', () => {
        console.log('Client disconnected');
        handle_client_disconnected(ws);
    });
});

function handle_client_connected(ws) {
    players.add(ws);
}

function handle_client_disconnected(ws) {
    players.remove(ws);
}

function handle_client_message(ws, message) {
    try {
        parse_message(ws, JSON.parse(message.toString()))
    } catch (error) {
        console.log(error)
        ws.send(JSON.stringify({ error: true, reason: "api error" }));
    }
}

function parse_message(ws, message) {
    switch (message.type) {
        case "auth":
            handle_auth_message(ws, message.args);
            break;
        case "load-character":
            handle_load_character_message(ws, message.args);
            break;
        case "send-chat-message":
            handle_send_message_message(ws, message.args);
        default:
            break;
    }
}

async function handle_auth_message(ws, args) {

    // var err, result = await pool.query('SELECT * FROM players WHERE username = $1 AND password = $2', [args.username, args.password]);
    var err, result = await database.auth_player(args.username, args.password)
    if (err) {
        ws.send(JSON.stringify({ error: true, reason: "api error" }));
        return;
    }

    var cookie = result ? uuidv4() : "";

    send_auth_response(ws, result, cookie);

    // Authentication failed, disconnecting client
    if (!result) {
        ws.close();
        return;
    }

    players.login(ws, args.username, cookie);
}

function send_auth_response(ws, auth, cookie) {
    ws.send(JSON.stringify({
        "type": "auth-response",
        "error": false,
        "data": {
            "auth": auth,
            "cookie": cookie
        }
    }));
}

async function handle_load_character_message(ws, args) {
    // Get the character from the database
    var err, result = await database.get_character(args.character);

    if (err) {
        ws.send(JSON.stringify({ error: true, reason: "api error" }));
        return;
    }

    var level_info = null;

    if (result == null) {
        console.log("Creating character for player " + args.username);
        err = database.create_character(args.username, args.username, STARTER_LEVEL, STARTER_POS)
        if (err) {
            ws.send(JSON.stringify({ error: true, reason: "api error" }));
            return;
        }
        level_info = LEVELS_INFO[STARTER_LEVEL];

    } else {
        level_info = LEVELS_INFO[result.level];
    }

    send_load_character_response(ws, "Grassland", level_info.address, level_info.port);
}

function send_load_character_response(ws, level, address, port) {
    ws.send(JSON.stringify({
        "type": "load-character-response",
        "error": false,
        "data": {
            "level": level,
            "address": address,
            "port": port
        }
    }));
}

function handle_send_message_message(ws, args) {
    var player = players.get_by_ws(ws);
    if (player == null) {
        ws.send(JSON.stringify({ error: true, reason: "player does not exist" }));
        return;
    }

    if (!player.logged_in) {
        ws.send(JSON.stringify({ error: true, reason: "not logged in" }));
        return;
    }

    switch (args.type) {
        case "Global":
            var ws_message = JSON.stringify({
                "type": "chat-message",
                "error": false,
                "data": {
                    "type": "Global",
                    "from": player.username,
                    "message": args.message
                }
            });
            for (var i = 0; i < players.players.length; i++) {
                if (players.players[i].logged_in) {
                    players.players[i].ws.send(ws_message);
                }
            }
            break;
        case "Team":
            // TODO: team's message does not exist yet
            break;
        case "Wisper":
            // TODO: implement wisper messages
            break;
        default:
            break;
    }
}

// Start the HTTPS server used for the players
server.listen(WEBSOCKET_PORT, () => {
    console.log('Secure WebSocket server listening on port', WEBSOCKET_PORT);
});