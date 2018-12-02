const fs = require("fs");
const path = require("path");
const email = require("./email");
const edi = require("./edi");
const sql = require("./sql");
const unzipper = require("unzipper");
const moment = require("moment");
const CronJob = require("cron").CronJob;
const ediConfig = require("../config.json");
const winston = require("winston");

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "../logs/edi.log" })
    ]
});

const newDir = path.join(__dirname, path.normalize("../history/new/"));
const zipDir = path.join(__dirname, path.normalize("../history/zip/"));
const successDir = path.join(__dirname, path.normalize("../history/success/"));
const csvDir = path.join(__dirname, path.normalize("../history/csv/"));

const emailDownloadSettings = ediConfig.emailDownloadSettings;
const emailAddresses = ediConfig.customersEmails;
const poll = ediConfig.poll;

if (poll === true) {
    // Here we'll schedule the Cron job to run every 30 minutes
    new CronJob("0 */1 * * * *", function() {
        
        for (let customer of emailAddresses) {
            logger.log({
                level: "info",
                message: "Cron job is a running for " + customer
            });
            main(customer);
        }
    }, null, true, "Australia/Melbourne"); 
} else {
    for (let customer of emailAddresses) {
        main(customer);
    }
} 

async function main(customer) {

    await cleanNewDirectory();
    const emails = await email.downloadEmails(customer, emailDownloadSettings);
    for (let mail of emails) {
        const attachment = await email.downloadAttachment(mail);
        // We need to deal here with ZIP files. 
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
    }
    await cleanNewDirectory();
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
                const newFile = files[file].substr(0, len-3) + "csv";
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
                fs.renameSync(newDir + files[file], successDir + files[file]);
                logger.log({
                    level: "info",
                    message: "File: " + files[file] + "moved to Success directory.",
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

