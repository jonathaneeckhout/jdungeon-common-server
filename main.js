// Load the .env file
require('dotenv').config();

// Start the websocket server
// require("./src/wshandler")

// Start the app server
var appHandler = require("./src/apphandler").getInstance();
var wsHandler = require("./src/wshandler").getInstance();
appHandler.run();