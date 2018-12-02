const _ = require("lodash");

const x12Documents = {
    810: "Invoice",
    850: "Purchase Order",
    852: "Product Activity Details",
    855: "Purchase Order Acknowledgement",
    856: "Advanced Shipping Notice",
};

const activityCodes = {
    DG: "Quantity damanged",
    HL: "Quantity on hold",
    LS: "Lost Sales",
    OQ: "Pleanned Order Quantity",
    PO: "Calculated Reorder Point",
    QA: "Current Inventory Available",
    QC: "Quantity committed",
    QD: "Additional Demand Quantiy",
    QI: "Quantity in Transit",
    QL: "Minimum Inventory Quantity",
    QM: "Maximum Inventory Quantity",
    QO: "Quantity Out of Stock",
    QP: "Quantity on Order",
    QR: "Quantity Received",
    QS: "Quantity Sold",
    QT: "Adjustment to Inventory Quantity",
    QU: "Quantity Returned by Customer",
    QZ: "Quantity Transferred",
};

const productType = {
    BP: "Buyer's Part Number",
    CB: "Buyer's Catalog Number",
    EN: "European Article Number (EAN) (2-5-5-1)",
    RK: "Rack Number",
    U2: "U.P.C. Shipping Container Code (1-2-5-5)",
    UD: "U.P.C./EAN Consumer Package Code (2-5-5)",
    UI: "U.P.C. Consumer Package Code (1-5-5)",
    UK: "U.P.C./EAN Shipping Container Code (1-2-5-5-1)",
    VC: "Vendor's (Seller's) Catalog Number",
    VP: "Vendor's (Seller's) Part Number",
};

module.exports = class X12 {
    constructor(ediDocument) {
        this.document = this.formatEDI(ediDocument);
        this.setdocType(ediDocument);
        this.pad = this.extractEDI();
    }

    formatEDI(document) {
        // Some customers send EDI Documents that are only on one line so we need to then add line breaks
        const multiLineDoc = document.replace(/~/g, "~\n");
        return multiLineDoc;
    }

    setdocType(document) {
        // let match = false;
        // Some documents coming through from Target are only on one line, so we need to make them multiLine
        const documentLines = document.match(/[^\r\n]+/g);
        for (const line in documentLines) {
            if (documentLines[line].includes("ST") === true) {
                const cursor = documentLines[line].indexOf("ST");
                const docType = documentLines[line].slice(cursor + 3, cursor + 6);
                this.docType = docType;
                break;
            } else { this.docType = "We dont recognize that X12 Document"; }
        }
    }

    extractEDI() {
        if (this.docType === "852") {
            const itemTrans = this.splitDocumentByItem(this.document);   // This returns an array by Item
            const PAD = [];
            for (const item of Object.keys(itemTrans)) {
                // So first we can get the details of the Item
                const itemStr = _.filter(itemTrans[item], (o) =>  o.includes("LIN")).toString();
                const itemDetails = this.getItemDetails(itemStr);
                // then we can get each Activity Code
                const activity = this.splitDocumentByActivity(itemTrans[item]);
                // Then we can get every transaction
                const transactions = this.getActivity(activity);
                PAD.push({Item: itemDetails, Transactions: transactions});
            }
            return PAD;
        }
    }

    splitDocumentByItem(document) {
        // TODO: This code isn't great. It's verbose and hard to read. Needs to be refactored
        // I think a good way to refactor it would be to use Array.Filter and then Array.IndexOf
        const sliceCursor = [];
        const transactions = [];
        const arrayOfLines = document.match(/[^\r\n]+/g);
        // Extracting all Lines
        const items = _.filter(arrayOfLines, (o) => o.includes("LIN"));
        let cttCursor = "";
        // Slice the file by Lines. So we can look for the first line and then the second line for the matching key
        for (const item of Object.keys(items)) {
            for (const line of Object.keys(arrayOfLines)) {
                if (arrayOfLines[line].includes(items[item]) === true) {
                    sliceCursor.push(line);
                }
                // search for CTT here. The CTT indicates the end of the Line items
                if (arrayOfLines[line].includes("CTT") === true) {
                    cttCursor = line;
                }
            }
        }
        // We can now slice the array, making sure the last one is sliced as per CTT
        for (const begCursor of Object.keys(sliceCursor)) {
            const begCursorInt = parseInt(begCursor, 10);
            if (parseInt(begCursor, 10) < sliceCursor.length - 1) {
                transactions.push(arrayOfLines.slice(sliceCursor[begCursor], sliceCursor[begCursorInt + 1]));
            } else { transactions.push(arrayOfLines.slice(sliceCursor[begCursor], cttCursor)); }

        }
        return transactions;
    }

    splitDocumentByActivity(itemBlock) {
        const sliceCursor = [];
        const transactions = [];
        // Extracting all Lines
        const activity = _.filter(itemBlock, (o) => o.includes("ZA"));
        // Slice the file by Lines. So we can look for the first line and then the second line for the matching key
        for (const key of Object.keys(activity)) {
            for (const line in itemBlock) {
                if (itemBlock[line].includes(activity[key]) === true) {
                    sliceCursor.push(line);
                }
            }
        }
        // We can now slice the array, making sure the last one is sliced as per CTT
        for (const begCursor of Object.keys(sliceCursor)) {
            const begCursorInt = parseInt(begCursor, 10);
            if (parseInt(begCursor, 10) < sliceCursor.length - 1) {
                transactions.push(itemBlock.slice(sliceCursor[begCursor], sliceCursor[begCursorInt + 1]));
            } else { transactions.push(itemBlock.slice(sliceCursor[begCursor], itemBlock.length)); }

        }
        return transactions;
    }

    getActivity(transByActivity) {
        const activityByStoreQty = [];
        transByActivity.forEach((activity) => {
            //Take the first line and get Activity Code
            const activityCode = activity[0].substr(3,activity[0].length).replace(/~/g, "");
            // Starting index at 1 in order to miss the Header row which give us the Activity Code
            for (let index = 1; index < activity.length; index++) {
                // Create a new Array here of each transaction. So first Slice the SDQ*EA*92
                const sliced = activity[index].substr(10,activity[index].length).replace(/\*/g, "\n").replace(/~/g, "");
                const lines = sliced.match(/[^\r\n]+/g);
                const storeQty = [];
                for (let index1 = 0; index1 < lines.length - 1; index1++) {
                    // extract Store
                    const store = lines[index1];
                    // extract the Qty
                    const qty = lines[index1 + 1];
                    storeQty.push({store, qty});
                    index1++;
                }
                activityByStoreQty.push({activityCode: activityCode, transactions: storeQty});
            }
        });
        return activityByStoreQty;
    }

    getItemDetails(item) {
        // get the item
        const itemID = [];
        const cursor = [];
        const itemObj = item.replace(/\*/g, "\n");
        const arrayOfLines = itemObj.match(/[^\r\n]+/g);
        for (const prodCode of Object.keys(productType)) {
            for (const line in arrayOfLines) {
                if (arrayOfLines[line] === prodCode) {
                    cursor.push(line);
                }
            }
        }
        // now we need to extract
        for (const id of Object.keys(cursor)) {
            const idNum = Number(cursor[id]);
            itemID.push({productType: arrayOfLines[idNum], itemID: arrayOfLines[idNum + 1].replace("~", "") });
        }
        return itemID;
    }
};