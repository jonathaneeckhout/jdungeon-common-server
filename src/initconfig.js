const fs = require('fs');

var Database = require("./database");
var database = Database.getInstance();

const INIT_FILE = ".init.json";

function run() {
    if (fs.existsSync(INIT_FILE)) {
        fs.readFile(INIT_FILE, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
            } else {
                try {
                    const jsonData = JSON.parse(data);

                    if (jsonData.levels.length > 0) {
                        init_levels(jsonData.levels);
                    }
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            }
        });
    } else {
        console.log('No init file, so nothing to do here');
    }
}

async function init_levels(levels) {
    console.log("Initializing levels");

    await database.clear_levels();

    for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        await database.create_level(level.level, level.key, level.address, level.port);
    }
}


module.exports = { run };