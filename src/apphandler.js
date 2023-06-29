const https = require('https');
const fs = require('fs');
const express = require('express');

var Database = require("./database");
var Players = require("./players");

const APP_PORT = 3001;

var database = Database.getInstance();
var players = Players.getInstance();

// TODO: use other certificates for this connection
const serverOptions = {
    cert: fs.readFileSync('data/certs/app/X509_certificate.crt'),
    key: fs.readFileSync('data/certs/app/X509_key.key')
};

// Init express app
const app = express();

// Create Express HTTPS server
const server = https.createServer(serverOptions, app);


app.post('/api', (req, res) => {
    try {
        switch (req.body.type) {
            case "auth-cookie":
                res.json({ error: false, data: { auth: players.auth_with_cookie(req.body.args.username, req.body.args.cookie) } });
                break;
            default:
                res.json({ error: true, reason: "api error" })
                break;
        }
    } catch (error) {
        res.json({ error: true, reason: "api error" })
    }
});

app.get('/api/characters/:name', (req, res) => {
    try {
        var err, character = database.get_character(req.params.name);
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

// Start the HTTPS server used for level servers
server.listen(APP_PORT, () => {
    console.log('Secure app server listening on port', APP_PORT);
});