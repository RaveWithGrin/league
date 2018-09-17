'use strict';
var express = require('express');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var path = require('path');
var fileName = path.basename(__filename);

module.exports = function(logger, staticData, userData, matchData, db) {
    var start = function() {
        var app = express();
        var expressWs = require('express-ws')(app);
        var port = process.env.PORT || 8082;

        app.use(
            morgan('tiny', {
                stream: {
                    write: function morgan(message) {
                        var patt5 = /\s5[0-9]{2}\s[0-9]/;
                        var patt4 = /\s4[0-9]{2}\s[0-9]/;
                        if (patt5.test(message)) {
                            logger.error(message.trim());
                        } else if (patt4.test(message)) {
                            logger.warn(message.trim());
                        } else {
                            logger.debug(message.trim());
                        }
                    }
                }
            })
        );
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(cookieParser());

        app.set('view engine', 'ejs');

        require('./app/routes.js')(app, logger, staticData, userData, matchData, db);

        app.listen(port);
        logger.info('Server is running on serverPort=[' + port + ']');
    };

    return {
        start: start
    };
};
