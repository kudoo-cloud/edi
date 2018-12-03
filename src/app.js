const email = require("./email");
const edi = require("./edi");
const sql = require("./sql");
const unzipper = require("unzipper");
const moment = require("moment-timezone");
const winston = require("winston");
const path = require("path");
const fs = require("fs");

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "../logs/edi.log" })
    ]
});

module.exports = {
    logger: logger,
    main: main
};

const newDir = path.join(__dirname, path.normalize("../history/new/"));
const zipDir = path.join(__dirname, path.normalize("../history/zip/"));
const successDir = path.join(__dirname, path.normalize("../history/success/"));
const csvDir = path.join(__dirname, path.normalize("../history/csv/"));

async function main(customer, config) {

    await cleanNewDirectory();
    const emails = await email.downloadEmails(customer, config);
    for (let mail of emails) { 
        const attachment = await email.downloadAttachment(mail, config);
        // We need to deal here with ZIP files. 
        if (attachment === undefined) {
            logger.log({
                level: "info",
                message: "Aint no attachment innit!",
                datetime: moment().tz("Australia/Melbourne").format()
            }); 
        } else { 
            const ts = moment().tz("Australia/Melbourne").format().replace(/:/g, "");
            const len = attachment.filename.length;
            const newFileName = attachment.filename.substr(0, len -4) + " " + ts + attachment.filename.substr(len -4, len);
            if (attachment.filename.substr(attachment.filename.length-3,attachment.filename.length) === "zip") {
                // Then we'll extract the ZIP file to the ZIP directory.
                fs.writeFileSync(zipDir + newFileName, attachment.data);
                logger.log({
                    level: "info",
                    message: "File: " + newFileName + " successfully written to " + zipDir,
                    datetime: moment().tz("Australia/Melbourne").format()
                });
                await fs.createReadStream(zipDir + newFileName).pipe(unzipper.Extract({ path: newDir }));

                //fs.writeFileSync(path + attachment.filename, attachment.data);
            } else {
                fs.writeFileSync(newDir + newFileName, attachment.data);
                logger.log({
                    level: "info",
                    message: "File: " + newFileName + " successfully written to " + newDir,
                    datetime: moment().tz("Australia/Melbourne").format()
                });
            }
            await cleanNewDirectory();
        }
    }
}

async function cleanNewDirectory() {
    // Check if there are any files. If none return true
    let files = fs.readdirSync(newDir);
    if (files.length > 0) {
        // Iterate through every file
        for (let file in files) {
            try {
                const ediObj = new edi(newDir + files[file]);   
                logger.log({
                    level: "info",
                    message: "File: " + files[file] + "parsed successfully.",
                    datetime: moment().tz("Australia/Melbourne").format()
                });
                const len = files[file].length;
                const tss = moment().tz("Australia/Melbourne").format().replace(/:/g, "");
                const newFile = files[file].substr(0, len-4) + tss + ".csv";
                // Need to remove file extension and replace with .csv
                fs.writeFileSync(csvDir + newFile,ediObj.csv);
                logger.log({
                    level: "info",
                    message: "File: " + newFile + " saved.",
                    datetime: moment().tz("Australia/Melbourne").format()
                });
                // Upload the CSV into the database
                await sql.loadCSVintoDB(ediObj.csv,newFile);
                // We need to move the file to success folder
                const ts = moment().tz("Australia/Melbourne").format().replace(/:/g, "");
                const fname = files[file].substr(0, files[file].length - 4);
                const fext = files[file].substr(files[file].length - 4, files[file].length);
                fs.renameSync(newDir + files[file], successDir + fname + ts + fext);
                logger.log({
                    level: "info",
                    message: "File: " + files[file] +  + "moved to Success directory.",
                    datetime: moment().tz("Australia/Melbourne").format()
                });
            } catch (error) {
                logger.log({
                    level: "info",
                    message: "ERROR!" + error,
                    datetime: moment().tz("Australia/Melbourne").format()
                });
            }
        }
    }  else {
        logger.log({
            level: "info",
            message: "No new files found in the NEW directory.",
            datetime: moment().tz("Australia/Melbourne").format()
        });
    }
}

