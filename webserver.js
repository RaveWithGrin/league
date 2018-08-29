'use strict';
var express = require('express');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var path = require('path');
var fileName = path.basename(__filename);

<<<<<<< HEAD
module.exports = function(logger, api, db, userData) {
    var start = function() {
=======
module.exports = function(logger, api, db, userData, matchData) {
    var start = function(){
>>>>>>> ef95ca48b94331859f7e5b6d37a56c432e0e01ff
        var app = express();
        var expressWs = require('express-ws')(app);
        var port = process.env.PORT || 8082;

        app.use(morgan('combined'));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(cookieParser());

        app.set('view engine', 'ejs');

<<<<<<< HEAD
        require('./app/routes.js')(app, logger, api, db, userData);
=======
        require('./app/routes.js')(app, logger, api, db, userData, matchData);
>>>>>>> ef95ca48b94331859f7e5b6d37a56c432e0e01ff

        app.listen(port);
        logger.info(`Server is running on serverPort=[${port}]`);
    };

    return {
        start: start
<<<<<<< HEAD
    };
=======
    }
>>>>>>> ef95ca48b94331859f7e5b6d37a56c432e0e01ff
};
