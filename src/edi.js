const fs = require("fs");
const papa = require("papaparse");
const moment = require("moment");
const X12 = require("./x12");

module.exports =  class EDI {
    constructor(filePath) {
        this.document = this.readFile(filePath);
        this.ediStandard = this.getEDIStandard(this.document);
        this.sender = this.getSender(this.document);
        this.receiver = this.getReceiver(this.document);
        this.date = this.getDate(this.document);
        this.parsedDocument = new X12(this.document);
        this.convertEDI(this.parsedDocument.pad);
    }

    readFile(filePath) {
        const text = fs.readFileSync(filePath, "utf-8");
        return text;
    }

    getEDIStandard(ediFile) {
        const x12 = ediFile.indexOf("ISA");
        const edifact = ediFile.indexOf("UNB");
        if (x12 !== -1) {
            return "X12";
        } else if (edifact !== -1) {
            return "EDIFACT";
        } else { return "NONEDI"; }
    }

    getSender(ediFile) {
        const format = this.getEDIStandard(ediFile);
        if (format === "EDIFACT") {
            const pd = ediFile.indexOf("4+");
            const sender = ediFile.slice(pd + 2, pd + 15);
            return sender;
        } else if (format === "X12") {
            const pd = ediFile.indexOf("PD");
            const sender = ediFile.slice(pd + 3, pd + 15);
            return sender;
        } else { return "The file you are using is not a valid EDI file"; }
    }

    getReceiver(ediFile) {
        const format = this.ediStandard;
        if (format === "EDIFACT") {
            const pd = ediFile.indexOf("ZZ+");
            const receiver = ediFile.slice(pd + 3, pd + 17);
            return receiver;
        } else if (format === "X12") {
            const cursor = ediFile.indexOf("PD");
            const receiver = ediFile.slice(cursor + 16, cursor + 28);
            return receiver;
        } else { return "The file you are using is not a valid EDI file"; }
    }

    getDate(ediFile) {
        const format = this.ediStandard;
        if (format === "EDIFACT") {
            try {
                const cursor = ediFile.indexOf("ZZ+20");
                const date = moment(ediFile.slice(cursor + 3, cursor + 11)).format("YYYY-MM-DD");
                return date;
            } catch (error) {
                return error;
            }
        } else if (format === "X12") {
            try {
                const cursor = ediFile.indexOf("XQ");
                const date = moment(ediFile.slice(cursor + 12, cursor + 18), "YY-MM-DD").format("YYYY-MM-DD");
                return date;
            } catch (error) {
                return error;
            }
        } else { return "The file you are using is not a valid EDI file"; }
    }
    convertEDI(parsedDocument) {
        const jsonExport = [];
        // We want to iterate through every Line of the Document
        for (const item of Object.keys(parsedDocument)) {
            // get the item details
            const items = parsedDocument[item].Item;
            const transactions = parsedDocument[item].Transactions;
            // We want to iterate through every Activity code in the Line
            for (const activity of Object.keys(transactions)) {
                const activityCode = transactions[activity].activityCode;
                const storeQty = transactions[activity].transactions;
                // we want to iterate for every store and Qty
                for (const trans of Object.keys(storeQty)) {
                    const store = storeQty[trans].store;
                    const qty = storeQty[trans].qty;
                    let jsonLine = {};
                    if (items.length > 1) {
                        jsonLine = {
                            activityCode,
                            date: this.date,
                            itemID: items[0].itemID,
                            itemID2: items[1].itemID,
                            prodCode: items[0].productType,
                            prodCode2: items[1].productType,
                            qty,
                            receiver: this.receiver,
                            sender: this.sender,
                            store,
                        };

                    } else {
                        jsonLine = {
                            activityCode,
                            date: this.date,
                            itemID: items[0].itemID,
                            itemID2: "",
                            prodCode: items[0].productType,
                            prodCode2: "",
                            qty,
                            receiver: this.receiver,
                            sender: this.sender,
                            store,
                        };
                    }
                    jsonExport.push(jsonLine);
                }
            }
        }
        this.json = jsonExport;
        this.csv = papa.unparse(jsonExport);
    }

};
