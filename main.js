// Load the .env file
require('dotenv').config();

// Start the websocket server
require("./src/wshandler")

// Start the app server
require("./src/apphandler")
