var path = require('path');

module.exports = function(winston) {
    function CustomError() {
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
    }
    function getStack() {
        var stack = new CustomError().stack;
        var CALLER_INDEX = 2;
        var element = stack[CALLER_INDEX];
        var fileName = path.basename(element.getFileName());
        return '[' + element.getFunctionName() + '](' + fileName + ':' + element.getLineNumber() + ')';
    }

    var logger = {
        error: function(message) {
            winston.error(getStack() + ': ' + message);
        },
        warn: function(message) {
            winston.warn(getStack() + ': ' + message);
        },
        info: function(message) {
            winston.info(getStack() + ': ' + message);
        },
        verbose: function(message) {
            winston.verbose(getStack() + ': ' + message);
        },
        debug: function(message) {
            winston.debug(getStack() + ': ' + message);
        },
        silly: function(message) {
            winston.silly(getStack() + ': ' + message);
        }
    };
    var module = function(level, file, func, message) {
        logger[level]('[' + file + '][' + func + ']: ' + message);
    };
    return logger;
};
