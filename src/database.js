const { Pool } = require('pg');

const { DB_USER, DB_HOST, DB_PASSWORD } = process.env;

const createPlayersTableQuery = `
  CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL UNIQUE
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
            database: 'jdungeon',
            password: DB_PASSWORD,
            port: 5432, // default PostgreSQL port
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
        var err, result = await this._pool.query('SELECT * FROM players WHERE username = $1 AND password = $2', [username, password]);
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
}


module.exports = Database;
