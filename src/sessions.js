const session = require('express-session');

class Sessions {
    constructor() {
        this._instance = null;
        this.map = new Map();

        this.sessionParser = session({
            saveUninitialized: false,
            secret: '$eCuRiTy',
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
