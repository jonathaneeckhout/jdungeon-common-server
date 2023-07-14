const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DB_HOST = process.env.POSTGRES_HOST;
const DB_PORT = parseInt(process.env.POSTGRES_PORT, 10);
const DB_USER = process.env.POSTGRES_USER;
const DB_PASSWORD = process.env.POSTGRES_PASSWORD;
const DB_DB = process.env.POSTGRES_DB;

const createLevelsTableQuery = `
  CREATE TABLE IF NOT EXISTS levels (
    id SERIAL PRIMARY KEY,
    level VARCHAR(255) NOT NULL UNIQUE,
    key VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL
  );
`;

const createPlayersTableQuery = `
  CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
  );
`;

const createCharactersTableQuery = `
  CREATE TABLE IF NOT EXISTS characters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    player VARCHAR(255) NOT NULL,
    level VARCHAR(255) NOT NULL,
    pos_x REAL,
    pos_y REAL
  );
`;

class Database {
    constructor() {
        this._instance = null;
        this._pool = null;

        this.init();
    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new Database();
        }
        return this._instance;
    }

    init() {
        // Connect to database
        this._pool = new Pool({
            user: DB_USER,
            host: DB_HOST,
            database: DB_DB,
            password: DB_PASSWORD,
            port: DB_PORT, // default PostgreSQL port
        });

        // Create level table
        this._pool.query(createLevelsTableQuery, (err, result) => {
            if (err) {
                console.error('Error creating level table:', err);
            } else {
                console.log('Levels table created successfully');
            }
        });

        // Create players table
        this._pool.query(createPlayersTableQuery, (err, result) => {
            if (err) {
                console.error('Error creating players table:', err);
            } else {
                console.log('Players table created successfully');
            }
        });

        // Create characters table
        this._pool.query(createCharactersTableQuery, (err, result) => {
            if (err) {
                console.error('Error creating characters table:', err);
            } else {
                console.log('Characters table created successfully');
            }
        });
    }

    async auth_player(username, password) {
        var err, result = await this._pool.query('SELECT * FROM players WHERE username = $1', [username]);
        if (err) {
            console.error('Error executing query', err);
            return err, false;
        }

        if (result.rowCount == 0) {
            console.log("User " + username + " not found in database");
            return null, false;
        }

        try {
            // Compare the provided password with the hashed password
            const isMatch = await bcrypt.compare(password, result.rows[0]["password"]);
            return null, isMatch;
        } catch (err) {
            console.error('Error comparing passwords:', err);
            return err, false;
        }

    }

    async auth_level(level, key) {
        var err, result = await this._pool.query('SELECT * FROM levels WHERE level = $1 AND key = $2', [level, key]);
        if (err) {
            console.error('Error executing query', err);
            return err, false;
        }

        return null, (result.rowCount > 0);
    }

    async create_character(player, character, level, position) {
        var err, _ = await this._pool.query(
            'INSERT INTO characters (name, player, level, pos_x, pos_y) VALUES ($1, $2, $3, $4, $5)',
            [player, character, level, position.x, position.y]
        );
        return err;
    }

    async get_character(character_name) {
        var err, result = await this._pool.query('SELECT * FROM characters WHERE name = $1', [character_name]);
        if (err) {
            console.error('Error executing query', err);
            return err, null;
        }

        return null, (result.rowCount > 0) ? result.rows[0] : null;
    }

    async get_level(level_name) {
        var err, result = await this._pool.query('SELECT * FROM levels WHERE level = $1', [level_name]);
        if (err) {
            console.error('Error executing query', err);
            return err, null;
        }

        return null, (result.rowCount > 0) ? result.rows[0] : null;
    }

    async clear_levels() {
        await this._pool.query('DELETE FROM levels;');
    }

    async create_level(level, key, address, port) {
        var err, _ = await this._pool.query(
            'INSERT INTO levels (level, key, address, port) VALUES ($1, $2, $3, $4)',
            [level, key, address, port]
        );
        return err;
    }
}


module.exports = Database;
