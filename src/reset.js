const sql = require("./sql");
const fs = require("fs");
const path = require("path");

const directory = ["../history/csv","../history/fail","../history/new","../history/success","../history/zip"];

main();

async function main() {
    await sql.resetDB();
    sql.initDB();
    directory.forEach(url => {
        fs.readdir(url, (err, files) => {
            if (err) throw err;
          
            for (const file of files) {
                fs.unlink(path.join(url, file), err => {
                    if (err) throw err;
                });
            }
        });
    });
    
}
