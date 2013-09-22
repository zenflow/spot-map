var config = require('./config');

var poplib = require('poplib');

var email = new poplib(config.mail_port, config.mail_host, {enabletls: true});
email.on('error', function(err) {
	switch (err.errno){
		case 111: 
			console.log("Unable to connect to mail server");
			break;
		default:
			console.log("General mail server error");
	}
	console.log(err);
});
//email.on("invalid-state", function(cmd) {console.log("Invalid state. You tried calling " + cmd);});
//email.on("locked", function(cmd) {console.log("Current command has not finished yet. You tried calling " + cmd);});
email.once('connect', function(){
	console.log('connected to mail server');
	email.login(config.mail_username, config.mail_password);
});
email.once('login', function(status){
	if (status){
		console.log('logged in to mail server');
		email.list();
	} else {
		console.log('failed logging in to mail server');
		email.quit();
	}
});
email.once('list', function(status, msgcount, msgnumber, data, rawdata){
	console.log('got list from mail server');
	console.log(data?data.length:data);
	console.log(status, msgcount, msgnumber);
	email.quit(); 	//****************
});
process.on('exit', function(){
	email.quit();
});