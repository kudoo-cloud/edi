const imaps = require("imap-simple");
const moment = require("moment-timezone");
const winston = require("winston");

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "../logs/edi.log" })
    ]
});

exports.downloadEmails = async function downloadEmails(address, config) {
    
    const fetchOptions = {
        bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
        markSeen: config.emailDownloadSettings.markSeen,
        struct: true
    };

    const searchCriteria = [
        ["from", address]
    ];

    if (config.emailDownloadSettings.since === null) {
        config.emailDownloadSettings.since = moment.utc().format("YYYY-MM-DD");
    }

    if (config.emailDownloadSettings.unseen === true) {
        searchCriteria.push([ "UNSEEN", ["SINCE", config.emailDownloadSettings.since] ]);
    } else
        searchCriteria.push( ["SINCE", config.emailDownloadSettings.since]);

    const connection = await imaps.connect(config.incomingEmailAddress);
    logger.log({
        level: "info",
        message: "Connection to email address " + config.incomingEmailAddress.imap.user + " successful",
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
        message: emails.length + " emails downloaded sent to " + config.incomingEmailAddress.imap.user + " and from " + address,
        datetime: moment().tz("Australia/Melbourne").format()
    });
    connection.end();
    logger.log({
        level: "info",
        message: "Connection to email address " + config.incomingEmailAddress.imap.user + "closed",
        datetime: moment().tz("Australia/Melbourne").format()
    });
    return emails;
};

exports.downloadAttachment = async function downloadAttachment(email,config) {

    let attachments = [];
    try {
        const connection = await imaps.connect(config.incomingEmailAddress);
        logger.log({
            level: "info",
            message: "Connection to email address " + config.incomingEmailAddress.imap.user + " successful",
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
            message: "Connection to email address " + config.incomingEmailAddress.user + "closed",
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