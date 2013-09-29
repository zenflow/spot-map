var criteria = [
    ['FROM', 'matt_5001@hotmail.com'],
    ['ALL']
];

var path = require('path');
var express = require('express');
var config = require('./config');
var ImapQuery = require('./ImapQuery');

var data_points = [];

var imap_query = new ImapQuery(config.imap, criteria);
imap_query.on('error', function(error){
    throw error;
});
imap_query.on('message', function(message){
    if (!message){
        return;
    }
    var info = {};
    ['Latitude', 'Longitude', 'GPS location Date/Time'].forEach(function(key){
        var start = message.text.indexOf(key+':')+key.length+1;
        var end = message.text.indexOf('\r\n', start);
        info[key] = message.text.substring(start, end);
    });
    data_points.push({
        latitude: Number(info['Latitude']),
        longitude: Number(info['Longitude']),
        when: new Date(info['GPS location Date/Time'])
    });
    data_points.sort(function(a, b){
        return a.when > b.when ? 1 : -1;
    });
});
imap_query.check();

var app = express();
app.use(express.logger('dev')); // ***********************
app.use(express.compress());
app.use(express.favicon());
app.use(express.bodyParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);
app.get('/data.json', function(req, res){
    res.send(JSON.stringify({
        points: data_points
    }));
});
app.get('/*', function(req, res){
	res.send(404);
});
app.use(function(err, req, res, next){
    res.send(500);
	console.error('internal error!', err);
});
app.listen(config.port);
console.log('Listening on port ' + config.port);