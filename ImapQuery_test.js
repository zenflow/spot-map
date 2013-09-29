var fs = require('fs');
var ImapQuery = require('./ImapQuery');
var config = require('./config');

var criteria = [
    ['FROM', 'matt_5001@hotmail.com'],
    ['ALL']
];

var search = new ImapQuery(config.imap, criteria);
search.on('error', function(error){
    throw error;
    process.exit();
});
search.on('message', function(message){
    if (!message){
        fs.writeFileSync('ImapQuery.test.json', JSON.stringify(search.messages()));
        console.log('we\'re done');
        return;
    }
    console.log(message.uid, message.subject);
});

search.check();