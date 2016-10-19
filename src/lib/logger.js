'use strict';
var config = require('../config.json');

class Logger {
    toJSONLocal (date) {
        var local = new Date(date);
        local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return local.toJSON();
    }

    trace(message) {
        let sep = '--------------------';
        let nl = '\r\n';
        message = `${nl}${sep}${nl}timestamp:${this.toJSONLocal(new Date())}${nl}message:${message}${nl}`;
        console.log(message);
    }

    logError(error, message) {
        let nl = '\r\n';
        let sep = '--------------------';
        message = `message:${message}${nl}`;
        if(!message) {
            message = '';
        }

        message = `${nl}${sep}${nl}timestamp:${this.toJSONLocal(new Date())}${nl}name:${error.name}${nl}${message}${error.stack}${nl}${error.message}${nl}${sep}${nl}`;

        this.trace(message);
    }
}

module.exports = Logger;

