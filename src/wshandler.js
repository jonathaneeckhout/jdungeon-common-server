const WebSocket = require('ws');

var Database = require("./database");
var Sessions = require("./sessions");
var AppHandler = require("./apphandler");

const STARTER_LEVEL = process.env.STARTER_LEVEL;
const STARTER_POS = JSON.parse(process.env.STARTER_POS);

function onSocketError(err) {
    console.error(err);
}

class WsHandler {
    constructor() {
        this._instance = null;
        this.database = Database.getInstance();
        this.sessions = Sessions.getInstance();
        this.appHandler = AppHandler.getInstance();

        this.wss = new WebSocket.WebSocketServer({ clientTracking: false, noServer: true });

        this.appHandler.server.on('upgrade', (request, socket, head) => {
            socket.on('error', onSocketError);

            this.sessions.sessionParser(request, {}, () => {
                if (!request.session.userId) {
                    console.log("Not authorized");
                    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                    socket.destroy();
                    return;
                }

                socket.removeListener('error', onSocketError);

                this.wss.handleUpgrade(request, socket, head, (ws) => {
                    this.wss.emit('connection', ws, request);
                });
            });
        });

        this.wss.on('connection', (ws, request) => {
            const userId = request.session.userId;
            const username = request.session.username;

            this.sessions.map.set(userId, ws);

            ws.on('error', console.error);

            ws.on('message', (message) => {
                this.handle_client_message(ws, username, message);
            });

            ws.on('close', () => {
                this.sessions.map.delete(userId);
            });
        });
    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new WsHandler();
        }
        return this._instance;
    }

    handle_client_message(ws, username, message) {
        try {
            this.parse_message(ws, username, JSON.parse(message.toString()))
        } catch (error) {
            console.log(error)
            ws.send(JSON.stringify({ error: true, reason: "api error" }));
        }
    }

    parse_message(ws, username, message) {
        switch (message.type) {
            case "load-character":
                this.handle_load_character_message(ws, message.args);
                break;
            case "send-chat-message":
                this.handle_send_message_message(ws, username, message.args);
            default:
                break;
        }
    }

    async handle_load_character_message(ws, args) {
        // Get the character from the database
        var err, result = await this.database.get_character(args.character);

        if (err) {
            ws.send(JSON.stringify({ error: true, reason: "api error" }));
            return;
        }

        var level = "";

        if (result == null) {
            console.log("Creating character for player " + args.username);
            err = await this.database.create_character(args.username, args.username, STARTER_LEVEL, STARTER_POS)
            if (err) {
                ws.send(JSON.stringify({ error: true, reason: "api error" }));
                return;
            }
            level = STARTER_LEVEL;

        } else {
            level = result.level;
        }

        err, result = await this.database.get_level(level);

        this.send_load_character_response(ws, level, result.address, result.port);
    }

    send_load_character_response(ws, level, address, port) {
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

    handle_send_message_message(ws, username, args) {
        switch (args.type) {
            case "Global":
                var ws_message = JSON.stringify({
                    "type": "chat-message",
                    "error": false,
                    "data": {
                        "type": "Global",
                        "from": username,
                        "message": args.message
                    }
                });
                for (const [key, value] of this.sessions.map) {
                    value.send(ws_message)
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

}

module.exports = WsHandler;
