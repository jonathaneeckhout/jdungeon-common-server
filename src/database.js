const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DB_HOST = process.env.POSTGRES_HOST;
const DB_PORT = parseInt(process.env.POSTGRES_PORT, 10);
const DB_USER = process.env.POSTGRES_USER;
const DB_PASSWORD = process.env.POSTGRES_PASSWORD;
const DB_DB = process.env.POSTGRES_DB;

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
                [character, player, level, position.x, position.y]
            );
        } catch (error) {
            console.error('Error executing query', error);
            return error;
        }

        return null;
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

    async get_characters_from_player(player) {
        try {
            var result = await this._pool.query('SELECT * FROM characters WHERE player = $1', [player]);
        } catch (error) {
            console.error('Error executing query', error);
            return error, null;
        }
        return null, result.rows;
    }

    async update_character(character_name, level, position, stats, inventory, equipment) {
        try {
            await this._pool.query(
                'UPDATE characters SET level = $1, pos_x = $2, pos_y = $3, stats = $4, inventory = $5, equipment = $6 WHERE name = $7;',
                [level, position.x, position.y, stats, inventory, equipment, character_name]
            );
        } catch (error) {
            console.error('Error executing query', error);
            return error;
        }
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
