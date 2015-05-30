var path = require('path');
var express = require('express');
var ko = require('knockout');
var config = require('./config');
var ImapQuery = require('imap-query');

var handle_error = function(error){
    console.error('error', error);
};

var points = ko.observable([]);
var json = ko.computed(function(){
    return JSON.stringify({
        points: points()
    });
});
var imap_query = new ImapQuery(config.imap, config.criteria);
var checkImapQuery = function(){
    imap_query.check().then(function(changes){
        if (!changes){return;}
        var messages = imap_query.messages();
        var _points = [];
        for (var uid in messages){
            var message = messages[uid];
            var info = {};
            ['Latitude', 'Longitude', 'GPS location Date/Time'].forEach(function(key){
                var start = message.plaintext.indexOf(key+':')+key.length+1;
                var end = message.plaintext.indexOf('\r\n', start);
                info[key] = message.plaintext.substring(start, end);
            });
            _points.push({
                latlng: [Number(info['Latitude']), Number(info['Longitude'])],
                when: new Date(info['GPS location Date/Time'])
            });
        }
        points(_points.sort(function(a, b){return a.when - b.when;}));
    }, handle_error);
};
checkImapQuery();
setInterval(checkImapQuery, 1000*60*config.interval);

var app = express();
app.use(express.logger('dev')); // ***********************
app.use(express.compress());
app.use(express.favicon());
app.use(express.bodyParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);
app.get('/data.json', function(req, res){
    res.send(json());
});
app.get('/*', function(req, res){
	res.send(404);
});
app.use(function(err, req, res, next){
    res.send(500);
	handle_error(err);
});
app.listen(config.port);
console.log('Listening on port ' + config.port);