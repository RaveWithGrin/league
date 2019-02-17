'use strict';
import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'body-parser';
import { basename } from 'path';
var fileName = basename(__filename);

export default function(logger, staticData, userData, matchData, db) {
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
        app.use(json());
        app.use(urlencoded({ extended: true }));
        app.use(cookieParser());

        app.set('view engine', 'ejs');

        require('./app/routes.js')(app, logger, staticData, userData, matchData, db);

        app.listen(port);
        logger.info('Server is running on serverPort=[' + port + ']');
    };

    return {
        start: start
    };
}
