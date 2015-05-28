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
    imap_query.check(function(error, updated){
        if (error){handle_error(error); return;}
        if (!updated){return;}
        points(imap_query.messages().map(function(message){
            var info = {};
            ['Latitude', 'Longitude', 'GPS location Date/Time'].forEach(function(key){
                var start = message.text.indexOf(key+':')+key.length+1;
                var end = message.text.indexOf('\r\n', start);
                info[key] = message.text.substring(start, end);
            });
            return {
                latlng: [Number(info['Latitude']), Number(info['Longitude'])],
                when: new Date(info['GPS location Date/Time'])
            };
        }).sort(function(a, b){
            return a.when - b.when;
        }));
    });
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