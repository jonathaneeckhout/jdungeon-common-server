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
        this.online = false;
        this._instance = null;
        this._pool = null;
    }

    static getInstance() {
        if (!this._instance) {
            this._instance = new Database();
        }
        return this._instance;
    }

    async init() {
        // Connect to database
        this._pool = new Pool({
            user: DB_USER,
            host: DB_HOST,
            database: DB_DB,
            password: DB_PASSWORD,
            port: DB_PORT, // default PostgreSQL port
        });

        // Create level table
        try {
            await this._pool.query(createLevelsTableQuery);
        } catch (error) {
            console.error('Error creating level table:', error);
            return false;
        }

        console.log('Levels table created successfully');

        // Create players table
        try {
            await this._pool.query(createPlayersTableQuery);
        } catch (error) {
            console.error('Error creating players table:', error);
            return false;
        }

        console.log('Players table created successfully');

        // Create characters table
        try {
            await this._pool.query(createCharactersTableQuery);
        } catch (error) {
            console.error('Error creating characters table:', error);
            return false;
        }

        console.log('Characters table created successfully');

        this.online = true;
        return true;
    }

    async auth_player(username, password) {
        try {
            var result = await this._pool.query('SELECT * FROM players WHERE username = $1', [username]);
        } catch (error) {
            console.error('Error executing query', error);
            return error, false;
        }

        if (result.rowCount == 0) {
            console.log("User " + username + " not found in database");
            return null, false;
        }

        try {
            // Compare the provided password with the hashed password
            const isMatch = await bcrypt.compare(password, result.rows[0]["password"]);
            return null, isMatch;
        } catch (error) {
            console.error('Error comparing passwords:', error);
            return err, false;
        }

    }

    async auth_level(level, key) {
        try {
            var result = await this._pool.query('SELECT * FROM levels WHERE level = $1 AND key = $2', [level, key]);
        } catch (error) {
            console.error('Error executing query', error);
            return error, false;
        }

        return null, (result.rowCount > 0);
    }

    async create_character(player, character, level, position) {
        try {
            await this._pool.query(
                'INSERT INTO characters (name, player, level, pos_x, pos_y) VALUES ($1, $2, $3, $4, $5)',
                [player, character, level, position.x, position.y]
            );
        } catch (error) {
            console.error('Error executing query', error);
            return error;
        }
    }

    async get_character(character_name) {
        try {
            var result = await this._pool.query('SELECT * FROM characters WHERE name = $1', [character_name]);
        } catch (error) {
            console.error('Error executing query', error);
            return error, null;
        }
        return null, (result.rowCount > 0) ? result.rows[0] : null;
    }

    async get_level(level_name) {
        try {
            var result = await this._pool.query('SELECT * FROM levels WHERE level = $1', [level_name]);
        } catch (error) {
            console.error('Error executing query', error);
            return error, null;
        }

        return null, (result.rowCount > 0) ? result.rows[0] : null;
    }

    async clear_levels() {
        try {
            await this._pool.query('DELETE FROM levels;');
        } catch (error) {
            console.error('Error executing query', error);
            return false;
        }
        return true;
    }

    async create_level(level, key, address, port) {
        try {
            await this._pool.query(
                'INSERT INTO levels (level, key, address, port) VALUES ($1, $2, $3, $4)',
                [level, key, address, port]
            );

        } catch (error) {
            console.error('Error executing query', error);
            return false;
        }
        return true;
    }
}


module.exports = Database;
