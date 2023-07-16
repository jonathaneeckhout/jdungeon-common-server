// Load the .env file
require('dotenv').config();

var utils = require("./src/utils");

// Init the database
var Database = require("./src/database");
var database = Database.getInstance();

var initConfig = require("./src/initconfig")

const RETRY_TIME = 3000;

async function run() {
    while (! await database.init()) {
        console.log(`Could not init database, retrying in ${RETRY_TIME} ms`);
        await utils.delay(RETRY_TIME);
    }
    console.log("database connected");

    // Init the database values
    initConfig.run();

    // Start the app server
    var appHandler = require("./src/apphandler").getInstance();
    var wsHandler = require("./src/wshandler").getInstance();
    appHandler.run();
}


run();