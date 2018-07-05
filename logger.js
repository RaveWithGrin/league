module.exports = function(logger){
    var module = function(level, file, func, message){
        logger[level]('[' + file + '][' + func + ']: ' + message);
    };
    return module;
};