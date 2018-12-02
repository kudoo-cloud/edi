const sql = require("msnodesqlv8");
const moment = require("moment");
const winston = require("winston");
const papa = require("papaparse");

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "../logs/edi.log" })
    ]
});
 
const connAX09 = "server=AUSUNAX21;Database=DynamicsAx_Prod;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";
const connBRIDW = "server=AUSUNAX25;Database=BRI Data Warehouse;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";
const connNewDB = "server=Aumelfs03\\aumelfs03;Database=pad;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";

exports.initDB = function initDB() {
    initStores();
    initSenderTable();
    initAxBarcodes();
    initActivityCodes();
    initEdi();
};

exports.resetDB = async function resetDB() {
    const truncate = [  
        "TRUNCATE TABLE activityCodes",
        "TRUNCATE TABLE barCodes",
        "TRUNCATE TABLE padTrans",
        "TRUNCATE TABLE senders",
        "TRUNCATE TABLE stores"
    ];

    truncate.forEach(query =>{
        sql.query(connNewDB, query, (err, rows) => {
            if(err) {
                logger.log({
                    level: "error",
                    message: err,
                });
                return;
            }
            logger.log({
                level: "info",
                message: rows + " inserted successfully into Database.",
            });
        });
    });
};

exports.loadCSVintoDB = function loadCSVintoEDITable(csv,fileName){
    const data = papa.parse(csv);
    // Need to skip the first line of the csv for headers
    data.data.forEach(trans => {
        if (trans[0] === "activityCode") {
            logger.log({
                level: "info",
                message: " Header row detected.",
            });   
        } else {
            const m = moment(trans[1]).format("YYYY-MM-DD");
            const insert = `INSERT INTO padTrans
            VALUES  
            ('${trans[0]}', '${m}', 
            '${trans[2]}','${trans[3]}',
            '${trans[4]}','${trans[5]}',
            '${trans[6]}','${trans[7]}',
            '${trans[8]}','${trans[9]}',
            '${fileName}')`;
            sql.query(connNewDB, insert, (err, rows) => {
                if(err) {
                    logger.log({
                        level: "error",
                        message: err,
                    });
                    return;
                }
                logger.log({
                    level: "info",
                    message: rows + " inserted successfully into Database.",
                });
            });
        }
    });
};   

async function initEdi() {
    const createTable = `CREATE TABLE padTrans (
                            activityCode varchar(10),
                            date date,
                            itemID varchar(60),
                            itemID2 varchar(60),
                            prodCode varchar(60),
                            prodCode2 varchar(60),
                            qty smallint,
                            receiver varchar(60),
                            sender varchar(60),
                            store varchar(60),
                            originalFile varchar(255)
                            )`;

    await sql.query(connNewDB, createTable, (err, rows) => {
        if(err) {
            logger.log({
                level: "error",
                message: err,
            });
            return;
        }
        logger.log({
            level: "info",
            message: " Table has successfully been created.",
        });  
    });
}

async function initActivityCodes() {
    // Need to create the table
    const createTable = "CREATE TABLE activityCodes (code varchar(10), description varchar(255))";

    await sql.query(connNewDB, createTable, (err, rows) => {
        if(err) {
            logger.log({
                level: "error",
                message: err,
            });
            return;
        }
        logger.log({
            level: "info",
            message: "barCodes Table has successfully been created.",
        });  
    });

    // Need to insert data into the table
    const insertTable = `INSERT INTO activityCodes
                        (code,description)
                        VALUES
                        ('DG', 'Quantity damaged'),
                        ('HL', 'Quantity on hold'),
                        ('LS', 'Lost Sales'),
                        ('OQ', 'Pleanned Order Quantity'),
                        ('PO', 'Calculated Reorder Point'),
                        ('QA', 'Current Inventory Available'),
                        ('QC', 'Quantity committed'),
                        ('QD', 'Additional Demand Quantiy'),
                        ('QI', 'Quantity in Transit'),
                        ('QL', 'Minimum Inventory Quantity'),
                        ('QM', 'Maximum Inventory Quantity'),
                        ('QO', 'Quantity Out of Stock'),
                        ('QP', 'Quantity on Order'),
                        ('QR', 'Quantity Received'),
                        ('QS', 'Quantity Sold'),
                        ('QT', 'Adjustment to Inventory Quantity'),
                        ('QU', 'Quantity Returned by Customer'),
                        ('QZ', 'Quantity Transferred');`;
    
    sql.query(connNewDB, insertTable, (err, rows) => {
        if(err) {
            logger.log({
                level: "error",
                message: err,
            });
            return;
        }
        logger.log({
            level: "info",
            message: "ActivityCodes are a go!",
        });  
    });
}

async function initAxBarcodes() {

    const createTable = "CREATE TABLE barCodes (barcode varchar(255), itemID varchar(255))";

    await sql.query(connNewDB, createTable, (err, rows) => {
        if(err) {
            logger.log({
                level: "error",
                message: err,
            });
            return;
        }
        logger.log({
            level: "info",
            message: "barCodes Table has successfully been created.",
        });  
    });

    const query = "SELECT distinct ITEMBARCODE,ITEMID FROM INVENTITEMBARCODE";   

    sql.query(connAX09, query, (err, rows) => {
        rows.forEach(row => {
            const insert = `INSERT INTO barCodes
                            VALUES  
                            ('${row.ITEMBARCODE}', '${row.ITEMID}')`;
            sql.query(connNewDB, insert, (err, rows) => {
                if(err) {
                    logger.log({
                        level: "error",
                        message: err,
                    });
                    return;
                }
                logger.log({
                    level: "info",
                    message: rows + " inserted successfully into Database.",
                });
            });
        });
    });
}

async function initSenderTable() {
    const createTable =  "CREATE TABLE senders (code varchar(50), description varchar(255))";

    await sql.query(connNewDB, createTable, (err, rows) => {
        if(err) {
            logger.log({
                level: "error",
                message: err,
            });
            return;
        }
        logger.log({
            level: "info",
            message: "Sender Table has successfully been created.",
        });  
    });

    const query = "SELECT SenderID,SenderName FROM PAD_Sender";

    sql.query(connBRIDW, query, (err, rows) => {
        rows.forEach(row => {
            const insert = `INSERT INTO senders
                            VALUES  
                            ('${row.SenderID}', '${row.SenderName}')`;
            sql.query(connNewDB, insert, (err, rows) => {
                if(err) {
                    logger.log({
                        level: "error",
                        message: err,
                    });
                    return;
                }
                logger.log({
                    level: "info",
                    message: rows + " inserted successfully into Database.",
                });
            });
        });
    });
}


async function initStores() {
    // We need to create the tables and then update them
    const createTable = `CREATE TABLE stores (
        company varchar(255),
        storeID varchar(255), 
        storeName varchar(255),
        storeType varchar(255)
        )`;    
    
    await sql.query(connNewDB, createTable, (err, rows) => {
        if(err) {
            logger.log({
                level: "error",
                message: err,
            });
            return;
        }
        logger.log({
            level: "info",
            message: "Store Table has successfully been created.",
        });  
    });
        
    const query = "SELECT Company, StoreID, StoreName, StoreType from PAD_Stores";
    
    sql.query(connBRIDW, query, (err, rows) => {
        rows.forEach(row => {
            const insert = `INSERT INTO stores
                            VALUES  
                            ('${row.Company}', '${row.StoreID}', '${row.StoreName}', '${row.StoreType}')`;
            sql.query(connNewDB, insert, (err, rows) => {
                if(err) {
                    logger.log({
                        level: "error",
                        message: err,
                    });
                    return;
                }
                logger.log({
                    level: "info",
                    message: rows + " inserted successfully into Database.",
                });
            });
        });
    });
}    