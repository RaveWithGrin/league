import { createLogger, format as _format, transports as _transports } from 'winston';
import { basename } from 'path';

export default function(level) {
    var CustomError = function() {
        var oldStackTrace = Error.prepareStackTrace;
        var oldLimit = Error.stackTraceLimit;
        try {
            Error.stackTraceLimit = 3;
            Error.prepareStackTrace = (err, structuredStackTrace) => structuredStackTrace;
            Error.captureStackTrace(this, CustomError);
            this.stack;
        } finally {
            Error.stackTraceLimit = oldLimit;
            Error.prepareStackTrace = oldStackTrace;
        }
    };

    var getStack = function() {
        var stack = new CustomError().stack;
        var CALLER_INDEX = 2;
        var element = stack[CALLER_INDEX];
        var fileName = basename(element.getFileName());
        return '[' + element.getFunctionName() + '](' + fileName + ':' + element.getLineNumber() + ')';
    };

    var winstonLogger = createLogger({
        format: _format.combine(
            _format.timestamp(),
            _format.printf(function(msg) {
                return msg.timestamp + ' ' + msg.level.toUpperCase() + ' ' + msg.message;
            })
        ),
        transports: [new _transports.Console()],
        level: level
    });

    var logger = {
        error: function(message) {
            winstonLogger.error(getStack() + ': ' + message);
        },
        warn: function(message) {
            winstonLogger.warn(getStack() + ': ' + message);
        },
        info: function(message) {
            winstonLogger.info(getStack() + ': ' + message);
        },
        verbose: function(message) {
            winstonLogger.verbose(getStack() + ': ' + message);
        },
        debug: function(message) {
            winstonLogger.debug(getStack() + ': ' + message);
        },
        silly: function(message) {
            winstonLogger.silly(getStack() + ': ' + message);
        }
    };
    return logger;
}
