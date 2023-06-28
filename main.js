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

const LEVELS_INFO = { "Grassland": { "address": "127.0.0.1", "port": 4434 } };
const STARTER_LEVEL = "Grassland";
const STARTER_POS = { x: 128.0, y: 128.0 };

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
            handle_auth_message(ws, message.args);
            break;
        case "load-character":
            handle_load_character_message(ws, message.args);
            break;
        default:
            break;
    }
}

async function handle_auth_message(ws, args) {

    var err, result = await pool.query('SELECT * FROM players WHERE username = $1 AND password = $2', [args.username, args.password]);
    if (err) {
        console.error('Error executing query', err);
        ws.send(JSON.stringify({ error: true, reason: "api error" }));
        return;
    }

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

    // Authentication failed, disconnecting client
    if (!auth) {
        ws.close();
        return;
    }

    players.ws.logged_in = true;
    players.ws.cookie = cookie
}

async function handle_load_character_message(ws, args) {
    var err, result = await get_character(args.character);

    if (err) {
        ws.send(JSON.stringify({ error: true, reason: "api error" }));
        return;
    }

    var level_info = null;

    if (result == null) {
        console.log("Creating character for player " + args.username);
        var err_create, _ = await pool.query(
            'INSERT INTO characters (name, player, level, pos_x, pos_y) VALUES ($1, $2, $3, $4, $5)',
            [args.username, args.username, STARTER_LEVEL, STARTER_POS.x, STARTER_POS.y]);
        if (err_create) {
            ws.send(JSON.stringify({ error: true, reason: "api error" }));
            return;
        }
        level_info = LEVELS_INFO[STARTER_LEVEL];

    } else {
        level_info = LEVELS_INFO[result.level];
    }

    ws.send(JSON.stringify({
        "type": "load-character-response",
        "error": false,
        "data": {
            "level": "Grassland",
            "address": level_info.address,
            "port": level_info.port
        }
    }));
}

async function get_character(character_name) {
    var err, result = await pool.query('SELECT * FROM characters WHERE name = $1', [character_name]);
    if (err) {
        console.error('Error executing query', err);
        return err, null;
    }

    return err, (result.rowCount > 0) ? result.rows[0] : null;
}

// Start the HTTPS server
server.listen(PORT, () => {
    console.log('Secure WebSocket server listening on port', PORT);
});