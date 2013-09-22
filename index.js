var config = require('./config');

var path = require('path');
var express = require('express');

var app = express();
app.use(express.logger('dev')); // ***********************
app.use(express.compress());
app.use(express.favicon());
app.use(express.bodyParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);
//routes go here //*****
app.get('/*', function(req, res){
	res.send(404);
});
app.use(function(err, req, res, next){
	console.error('internal error!', err);
	res.send(500);
});
app.listen(config.port);
console.log('Listening on port ' + config.port);