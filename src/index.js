const path = require("path");
const edi = require("./app");

const CronJob = require("cron").CronJob;
const ediConfig = require("../config.json");

const emailDownloadSettings = ediConfig.emailDownloadSettings;
const emailAddresses = ediConfig.customersEmails;

// Here we'll schedule the Cron job to run every 30 minutes
new CronJob("0 */1 * * * *", function() {   
    for (let customer of emailAddresses) {
        edi.logger.log({
            level: "info",
            message: "Cron job is a running for " + customer
        });
        edi.main(customer, emailDownloadSettings);
    }
}, null, true, "Australia/Melbourne"); 


