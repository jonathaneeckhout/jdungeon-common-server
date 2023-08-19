const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const uuid = require('uuid');

var Database = require("./database");
var Sessions = require("./sessions");

const APP_PORT = parseInt(process.env.APP_PORT, 10);
const APP_CRT = process.env.APP_CRT;
const APP_KEY = process.env.APP_KEY;

const STARTER_LEVEL = process.env.STARTER_LEVEL;
const STARTER_POS = JSON.parse(process.env.STARTER_POS);

const MAX_CHARACTERS_PER_PLAYER = 5;

const LEVEL_INFO_PATH = "./level_info";

const serverOptions = {
    cert: fs.readFileSync(APP_CRT),
    key: fs.readFileSync(APP_KEY)
};

class AppHandler {
    constructor() {
        this._instance = null;
        this.database = Database.getInstance();
        this.sessions = Sessions.getInstance();

        this.players = new Map();

        // Init express app
        this.app = express();

        this.app.use(this.sessions.sessionParser);

        this.app.use(express.json({ limit: '128mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '128mb' }));

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
        this.app.post('/player/login', async (req, res) => {
            try {
                var err, result = await this.database.auth_player(req.body.username, req.body.password);
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

                const secret = uuid.v4();

                this.players.set(req.body.username, secret);

                console.log("Player " + req.body.username + " logged in");

                res.json({ error: false, data: { auth: true, secret: secret } });

            } catch (error) {
                res.json({ error: true, reason: "api error" });
            }
        });

        this.app.post('/level/login', async (req, res) => {
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

                console.log("Level " + req.body.level + " logged in");

                res.json({ error: false, data: { auth: true } });

            } catch (error) {
                res.json({ error: true, reason: "api error" });
            }
        });

        this.app.post('/level/login/player', async (req, res) => {
            try {
                if (!req.session.levelId) {
                    res.json({ error: true, reason: "unauthorized" });
                    return;
                }

                var secret = this.players.get(req.body.username);
                if (secret == undefined || secret != req.body.secret) {
                    res.json({ error: false, data: { auth: false } });
                    return;
                }

                res.json({ error: false, data: { auth: true } });

            } catch (error) {
                res.json({ error: true, reason: "api error" });
            }
        });

        this.app.post('/level/info', async (req, res) => {
            try {
                if (!req.session.levelId) {
                    res.json({ error: true, reason: "unauthorized" });
                    return;
                }

                var level = req.body.level;
                var hash = req.body.hash;
                var info = req.body.info;

                if (!fs.existsSync(LEVEL_INFO_PATH)) {
                    fs.mkdirSync(LEVEL_INFO_PATH, { recursive: true });
                }

                var infoFilePath = path.join(LEVEL_INFO_PATH, level + "-info.json");

                var err = await fs.promises.writeFile(infoFilePath, JSON.stringify(info));
                if (err) {
                    res.json({ error: true, reason: "api error" });
                    return;
                } else {
                    console.log('Level info is stored in:', infoFilePath);
                }

                var hashFilePath = path.join(LEVEL_INFO_PATH, level + "-hash.json");

                var err = await fs.promises.writeFile(hashFilePath, JSON.stringify({ hash: hash }));
                if (err) {
                    res.json({ error: true, reason: "api error" });
                    return;
                } else {
                    console.log('Level hash is stored in:', hashFilePath);
                }

                res.json({ error: false });


            } catch (error) {
                res.json({ error: true, reason: "api error" });
            }
        });

        this.app.get('/level/info', async (req, res) => {
            try {
                if (!req.session.userId) {
                    res.json({ error: true, reason: "unauthorized" });
                    return;
                }

                var level = req.query.level;
                var hash = req.query.hash;

                if (!level || level == "") {
                    res.json({ error: true, reason: "api error" });
                    return;
                }

                var stored_hash = 0

                if (hash) {
                    var hashFilePath = path.join(LEVEL_INFO_PATH, level + "-hash.json");
                    var err, data = await fs.promises.readFile(hashFilePath, 'utf-8');
                    if (err) {
                        res.json({ error: true, reason: "api error" });
                        return;
                    }

                    var jsonData = JSON.parse(data);
                    stored_hash = jsonData.hash;
                    if (stored_hash == hash) {
                        res.json({ error: false, data: { new: false, hash: 0, info: {} } });
                        return;
                    }
                }

                var infoFilePath = path.join(LEVEL_INFO_PATH, level + "-info.json");
                var err, data = await fs.promises.readFile(infoFilePath, 'utf-8');
                if (err) {
                    res.json({ error: true, reason: "api error" });
                    return;
                }

                var jsonData = JSON.parse(data);
                res.json({ error: false, data: { new: true, hash: stored_hash, info: jsonData } });


            } catch (error) {
                res.json({ error: true, reason: "api error" });
            }
        });

        this.app.get('/level/ping', async (req, res) => {
            try {
                if (!req.session.levelId) {
                    res.json({ error: true, reason: "unauthorized" });
                    return;
                }

                res.json({ error: false });


            } catch (error) {
                res.json({ error: true, reason: "api error" });
            }
        });

        this.app.get('/level/characters/:name', async (req, res) => {
            try {
                if (!req.session.levelId) {
                    res.json({ error: true, reason: "unauthorized" });
                    return;
                }

                var err, character = await this.database.get_character(req.params.name);
                if (err) {
                    console.error('Error executing query', err);
                    res.json({ error: true, reason: "api error" });
                } else {
                    if (character) {
                        res.json({
                            error: false,
                            data: {
                                name: character.name,
                                player: character.player,
                                level: character.level,
                                position: {
                                    x: character.pos_x,
                                    y: character.pos_y
                                },
                                stats: character.stats,
                                inventory: character.inventory,
                                equipment: character.equipment
                            }
                        });
                    } else {
                        res.json({ error: true, reason: "not found" });
                    }
                }
            } catch (error) {
                res.json({ error: true, reason: "api error" });
            }
        });

        this.app.post('/level/characters', async (req, res) => {
            try {
                if (!req.session.levelId) {
                    res.json({ error: true, reason: "unauthorized" });
                    return;
                }

                var err = await this.database.update_character(
                    req.body.character,
                    req.body.level,
                    req.body.position,
                    req.body.stats,
                    req.body.inventory,
                    req.body.equipment
                );
                if (err) {
                    res.json({ error: true, reason: "api error" });
                    return;
                }

                res.json({ error: false });

            } catch (error) {
                res.json({ error: true, reason: "api error" });
            }
        });

        this.app.get('/player/characters', async (req, res) => {
            try {
                if (!req.session.userId) {
                    res.json({ error: true, reason: "unauthorized" });
                    return;
                }

                var err, characters = await this.database.get_characters_from_player(req.session.username);
                if (err) {
                    console.error('Error executing query', err);
                    res.json({ error: true, reason: "api error" });
                } else {
                    var data = []
                    for (let i = 0; i < characters.length; i++) {
                        var character = characters[i];
                        data.push({
                            name: character.name,
                            level: character.level
                        });
                    }

                    res.json({
                        error: false,
                        data: data
                    });
                }
            } catch (error) {
                res.json({ error: true, reason: "api error" });
            }
        });

        this.app.post('/player/characters/create', async (req, res) => {
            try {
                if (!req.session.userId) {
                    res.json({ error: true, reason: "unauthorized" });
                    return;
                }

                var err, characters = await this.database.get_characters_from_player(req.session.username);
                if (err) {
                    console.error('Error executing query', err);
                    res.json({ error: true, reason: "api error" });
                } else {
                    if (characters.length >= MAX_CHARACTERS_PER_PLAYER) {
                        console.error('Player ' + req.session.username + " has reached the limit of characters allowed per player");
                        res.json({ error: true, reason: "max characters reached" });
                        return;
                    }

                }

                err = await this.database.create_character(req.session.username, req.body.character, STARTER_LEVEL, STARTER_POS);
                if (err) {
                    res.json({ error: true, reason: "api error" });
                    return;
                }

                res.json({ error: false });

            } catch (error) {
                res.json({ error: true, reason: "api error" });
            }
        });

        this.app.get('/player/levels/:level', async (req, res) => {
            try {
                if (!req.session.userId) {
                    res.json({ error: true, reason: "unauthorized" });
                    return;
                }

                var err, level = await this.database.get_level(req.params.level);
                if (err) {
                    console.error('Error executing query', err);
                    res.json({ error: true, reason: "api error" });
                } else {
                    if (level) {
                        res.json({
                            error: false,
                            data: {
                                address: level.address,
                                port: level.port
                            }
                        });
                    } else {
                        res.json({ error: true, reason: "not found" });
                    }
                }
            } catch (error) {
                res.json({ error: true, reason: "api error" });
            }
        });
    }

}

module.exports = AppHandler;


