let port = +process.env.OPENSHIFT_NODEJS_PORT || 7001;
let host = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

let express = require('express');
let compression = require('compression');
let cors = require('cors');
//let multer = require('multer');
let fs = require('fs');

fs.mkdir('./dist/photos', function (err) {
    if (err && err.code !== 'EEXIST') {
        console.error(err);
    }
});

let app = express();
app.use(compression);
app.use(cors());
//let storage = multer.memoryStorage();
//let upload = multer({ storage: storage });

let api = require('./routes/api');
app.use('/api/v1', api);

app.listen(port, host, () => {
    console.log('Mobile backend ExpressJS application started at: ' + new Date() + ' on port: ' + port);
});