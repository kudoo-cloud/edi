# Overview 
This piece of code polls an email address for emails.

* downloads all the attachments to a file directory `./history/new`
* marks all emails as read
* converts edi attachments into a csv file
* moves the attachments to `./history/success` if successful
* moves the attachemt to `./history/fail` if the conversion fails
* uploads the edi csv into a database

This program will run in the background and will continuously perform the above mentioned functions

# Configuring
There are two files that will be used for configuring the system
* config.json
* config-migrate.json

# Logs
All the logs are automatically kept in the logs folder under a file called `edi.logs`.

# Running
To run the program first ensure that `node` has been setup on the computer running the software.

[Download Node](https://nodejs.org/en/download/current/)

We also want to make sure that the software never fails! So we use [PM2](https://pm2.io). `PM2` is a process manager that ensure's the software automatically restarts in case things go wrong. Ensure it's installed:
`npm install pm2 -g`

Then in the `edi` directory run the following commands:
`npm install`
`npm run start-prod`

If doing a migration you can run 
`npm run reset`
`npm run start-migrate`
