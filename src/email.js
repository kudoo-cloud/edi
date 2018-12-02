const imaps = require("imap-simple");
const moment = require("moment");
const userConfig = require("../config.json");
const winston = require("winston");

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "../logs/edi.log" })
    ]
});

let config = {};
config.imap = userConfig.incomingEmailAddress;

/**
 * @param {string} address an Email address
 * @param {json} emailDownloadSettings the settings to use when fetching emails. Should look like the following: ```{
        "markSeen": false,
        "unseen": true,
        "since": null
    }```
 */
exports.downloadEmails = async function downloadEmails(address, emailDownloadSettings) {

    //  
    const fetchOptions = {
        bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
        markSeen: emailDownloadSettings.markSeen,
        struct: true
    };

    const searchCriteria = [
        ["from", address]
    ];

    if (emailDownloadSettings.since === null) {
        emailDownloadSettings.since = moment.utc().format("YYYY-MM-DD");
    }

    if (emailDownloadSettings.unseen === true) {
        searchCriteria.push([ "UNSEEN", ["SINCE", emailDownloadSettings.since] ]);
    } else
        searchCriteria.push( ["SINCE", emailDownloadSettings.since]);

    const connection = await imaps.connect(config);
    logger.log({
        level: "info",
        message: "Connection to email address " + config.imap.user + " successful",
        datetime: moment().tz("Australia/Melbourne").format()
    });
    const box = await connection.openBox("INBOX");
    logger.log({
        level: "info",
        message: "Inbox opened successfuly",
        datetime: moment().tz("Australia/Melbourne").format()
    });
    const emails = await connection.search(searchCriteria, fetchOptions);
    logger.log({
        level: "info",
        message: emails.length + " emails downloaded sent to " + config.imap.user + " and from " + address,
        datetime: moment().tz("Australia/Melbourne").format()
    });
    connection.end();
    logger.log({
        level: "info",
        message: "Connection to email address " + config.imap.user + "closed",
        datetime: moment().tz("Australia/Melbourne").format()
    });
    return emails;
};

exports.downloadAttachment = async function downloadAttachment(email) {

    let attachments = [];
    try {
        const connection = await imaps.connect(config);
        logger.log({
            level: "info",
            message: "Connection to email address " + config.imap.user + " successful",
            datetime: moment().tz("Australia/Melbourne").format()
        });
        const box = await connection.openBox("INBOX");
        logger.log({
            level: "info",
            message: "Inbox opened successfuly",
            datetime: moment().tz("Australia/Melbourne").format()
        });
        // Email is broken down into Parts. Disposition type indicates whether it's an attachment
        let parts = await imaps.getParts(email.attributes.struct);
        // This returns an array of attachments
        attachments = await attachments.concat(parts.filter((part) => {
            return part.disposition && part.disposition.type.toUpperCase() === "ATTACHMENT";
        }));
        let data = await connection.getPartData(email, attachments[0]);
        let filename = await attachments[0].params.name;
        let attachment = await {filename, data};
        logger.log({
            level: "info",
            message: filename + " has been loaded into memory ",
            datetime: moment().tz("Australia/Melbourne").format()
        });
        connection.end();
        logger.log({
            level: "info",
            message: "Connection to email address " + config.imap.user + "closed",
            datetime: moment().tz("Australia/Melbourne").format()
        });
      
        return attachment;

    } catch (error) {
        logger.log({
            level: "error",
            message: error,
            datetime: moment().tz("Australia/Melbourne").format()
        });
    }
};