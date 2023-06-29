const { v4: uuidv4 } = require('uuid');

var Database = require("./database");

const LEVELS_INFO = { "Grassland": { "address": "127.0.0.1", "port": 4434 } };
const STARTER_LEVEL = "Grassland";
const STARTER_POS = { x: 128.0, y: 128.0 };

var database = Database.getInstance();
var players = {}

function handle_client_connected(ws) {
    players.ws = {
        ws: ws,
        username: "",
        logged_in: false,
        cookie: "",
        connected_time: Date.now()
    };
}

function handle_client_disconnected(ws) {
    delete players[ws];
}

function handle_client_message(ws, message) {
    // try {
    parse_message(ws, JSON.parse(message.toString()))
    // } catch (error) {
    //     ws.send(JSON.stringify({ error: true, reason: "api error" }));
    // }
}

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

    players.ws.username = args.username;
    players.ws.logged_in = true;
    players.ws.cookie = cookie
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


module.exports = {
    handle_client_connected,
    handle_client_disconnected,
    handle_client_message,
};