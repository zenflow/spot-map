var fs = require('fs');
var path = require('path');
var file = fs.readFileSync(path.join(__dirname, 'config.json'));
if (!file){
	console.log('missing config.json file');
	process.exit();
}
var config = JSON.parse(file);
module.exports = config;