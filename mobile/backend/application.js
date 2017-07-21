var express = require('express');
var cors = require('cors');
var request = require('request');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });	// ,inMemory: true
var fs = require('fs');

console.log("Starting backend mobile app: ", process.argv[1]);

var app = express(); // Express app

app.use(cors()); // Enable CORS for all requests
var jsonParser = bodyParser.json(); // Setup JSON body parser

// Bootstrap routes
require('./routes/routes')(app, jsonParser, upload);

var port = process.env.FH_PORT || process.env.OPENSHIFT_NODEJS_PORT || 7001;
var host = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

app.listen(port, host, function () {
	console.log("App started at: " + new Date() + " on port: " + port);
});