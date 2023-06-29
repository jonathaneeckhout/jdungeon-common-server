class Players {
    constructor() {
        this._instance = null;
        this.players = {};
    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new Players();
        }
        return this._instance;
    }

    add(ws) {
        this.players[ws] = {
            ws: ws,
            username: "",
            logged_in: false,
            cookie: "",
            connected_time: Date.now()
        };
    }

    remove(ws) {
        delete this.players[ws];
    }

    login(ws, username, cookie) {
        this.players[ws].username = username;
        this.players[ws].logged_in = true;
        this.players[ws].cookie = cookie
    }
}

module.exports = Players;
