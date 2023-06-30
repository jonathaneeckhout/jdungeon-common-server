class Players {
    constructor() {
        this._instance = null;
        this.players = [];
    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new Players();
        }
        return this._instance;
    }

    add(ws) {
        this.players.push({
            ws: ws,
            username: "",
            logged_in: false,
            cookie: "",
            connected_time: Date.now()
        });
    }

    remove(ws) {
        for (var i = 0; i < this.players.length; i++) {
            if (ws === this.players[i].ws) {
                this.players.splice(i, 1);
            }
        }
    }

    login(ws, username, cookie) {
        console.log("Player " + username + " logged in")
        var player = this.get_by_ws(ws);
        player.username = username;
        player.logged_in = true;
        player.cookie = cookie
    }

    get_by_ws(ws) {
        for (var i = 0; i < this.players.length; i++) {
            if (ws === this.players[i].ws) {
                return this.players[i];
            }
        }
        return null;
    }

    get_by_username(username) {
        for (var i = 0; i < this.players.length; i++) {
            if (username === this.players[i].username) {
                return this.players[i];
            }
        }
        return null;
    }

    auth_with_cookie(username, cookie) {
        var player = this.get_by_username(username);
        if (!player) {
            return false;
        }

        return (player.cookie == cookie)
    }
}

module.exports = Players;
