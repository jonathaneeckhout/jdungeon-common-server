const session = require('express-session');
const MemoryStore = require('memorystore')(session)

const COOKIE_SECRET = process.env.COOKIE_SECRET;

class Sessions {
    constructor() {
        this._instance = null;
        this.map = new Map();

        this.sessionParser = session({
            saveUninitialized: false,
            secret: COOKIE_SECRET,
            cookie: { maxAge: 86400000 },
            store: new MemoryStore({
                checkPeriod: 86400000 // prune expired entries every 24h
            }),
            resave: false
        });
    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new Sessions();
        }
        return this._instance;
    }

}

module.exports = Sessions;
