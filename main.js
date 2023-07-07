// Load the .env file
require('dotenv').config();

// Init the database
require("./src/initconfig").run();

// Start the app server
var appHandler = require("./src/apphandler").getInstance();
var wsHandler = require("./src/wshandler").getInstance();
appHandler.run();