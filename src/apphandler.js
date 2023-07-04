const https = require('https');
const fs = require('fs');
const express = require('express');
const uuid = require('uuid');

var Database = require("./database");
var Sessions = require("./sessions");

const APP_PORT = parseInt(process.env.APP_PORT, 10);

// TODO: use other certificates for this connection
const serverOptions = {
    cert: fs.readFileSync('data/certs/app/X509_certificate.crt'),
    key: fs.readFileSync('data/certs/app/X509_key.key')
};

class AppHandler {
    constructor() {
        this._instance = null;
        this.database = Database.getInstance();
        this.sessions = Sessions.getInstance();

        // Init express app
        this.app = express();

        this.app.use(express.json());
        this.app.use(this.sessions.sessionParser);

        // Create Express HTTPS server
        this.server = https.createServer(serverOptions, this.app);


        this.handle_paths();
    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new AppHandler();
        }
        return this._instance;
    }

    run() {
        // Start the HTTPS server used for level servers
        this.server.listen(APP_PORT, () => {
            console.log('Secure app server listening on port', APP_PORT);
        });
    }

    handle_paths() {
        this.app.post('/login/player', async (req, res) => {
            try {
                var err, result = await this.database.auth_player(req.body.username, req.body.password)
                if (err) {
                    res.json({ error: true, reason: "api error" });
                    return;
                }

                if (!result) {
                    res.json({ error: false, data: { auth: false } });
                    return;
                };

                const id = uuid.v4();
                req.session.userId = id;
                req.session.username = req.body.username;

                res.json({ error: false, data: { auth: true } });

            } catch (error) {
                res.json({ error: true, reason: "api error" })
            }
        });

        this.app.post('/login/level', async (req, res) => {
            try {
                var err, result = await this.database.auth_level(req.body.level, req.body.key)
                if (err) {
                    res.json({ error: true, reason: "api error" });
                    return;
                }

                if (!result) {
                    res.json({ error: false, data: { auth: false } });
                    return;
                };

                const id = uuid.v4();
                req.session.levelId = id;
                req.session.levelName = req.body.level;

                res.json({ error: false, data: { auth: true } });

            } catch (error) {
                res.json({ error: true, reason: "api error" })
            }
        });

        this.app.get('/api/characters/:name', async (req, res) => {
            try {
                if (!req.session.levelId) {
                    res.json({ error: true, reason: "unauthorized" })
                    return;
                }

                var err, character = await this.database.get_character(req.params.name);
                if (err) {
                    console.error('Error executing query', err);
                    res.json({ error: true, reason: "api error" });
                } else {
                    if (character) {
                        res.json({ error: false, data: { name: character.name, player: character.player, level: character.level, position: { x: character.pos_x, y: character.pos_y } } });
                    } else {
                        res.json({ error: true, reason: "not found" });
                    }
                }
            } catch (error) {
                res.json({ error: true, reason: "api error" })
            }
        });
    }

}

module.exports = AppHandler;


