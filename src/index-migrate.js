const edi = require("./app");
const ediConfig = require("../config-migrate.json");

const config = ediConfig;
const emailAddresses = ediConfig.customersEmails;

for (let customer of emailAddresses) {
    edi.main(customer, config);
}