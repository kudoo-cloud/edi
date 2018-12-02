# Overview 
This piece of code polls an email address for emails from `Britax` customers. 

* downloads all the attachments to a file directory `./history/new`
* marks all emails as read
* converts edi attachments into a csv file
* moves the attachments to `./history/success` if successful
* moves the attachemt to `./history/fail` if the conversion fails
* uploads the edi csv into a database

This program will run in the background and will continuously perform the above mentioned functions

**TODO**
* When saving `bigw.edi` as a file we need to append the timestamp
* Currently when there is a timeout from connecting to `imap` it shuts the program down. Need to handle this graciously

# Running
To run the program first ensure that `node` has been setup on the computer running the software.

[Download Node](https://nodejs.org/en/download/current/)

We also want to make sure that the software never fails! So we use [PM2](https://pm2.io). `PM2` is a process manager that ensure's the software automatically restarts in case shit goes wrong. Ensure it's installed:
`npm install pm2 -g`
`pm2 logs app`

Then in the `edi` directory run the following commands:
`npm install`
`npm run start`

If it's a production environment, please ensure these are set in config:
```json
"emailDownloadSettings": {
    "markSeen": true,
    "unseen": true,
    "since": null
}
```
# Configuring
If you would like the program to run differently to the way it's described above, you can configure it.

Within the `edi` directory there is a file called `config.json`. This file determines all the settings. 

```json
"emailDownloadSettings": {
    "markSeen": true,
    "unseen": false,
    "since": null,
}
```
If `markSeen` is set to `true`, then the program will mark all unseen emails to seen that it reads. If you specify the `since` date then the program will only look for emails from that date. The `unseen` flag if set to true will only return `unseen` emails.

```json
"incomingEmailAddress": {
    "user": "justin.trollip@britax.com",
    "password": "1qasw2!QASW@",
    "host": "imap.outlook.com",
    "port": 993,
    "tls": true,
    "authTimeout": 9000
    },
```
The `incomingEmailAddress` is the email address where the `EDI` documents are being emailed to.

```json
"customersEmails": [{
    "BigW": "BIGWPAD.Donotreply@leadtec.com.au"
},
{
    "KMART": "KmartB2BMail0@kmart.com.au"
},
{
    "Target": "emx@messagexchange.com"
}]
}
```

The `customersEmails` are the email addresses that are sending through `edi` data.



# Logs
All the logs are automatically kept in the logs folder.
