class Logger {
  static toJSONLocal(date) {
    const local = new Date(date);
    local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return local.toJSON();
  }

  trace(msg) {
    let message = msg;
    const sep = '--------------------';
    const nl = '\r\n';
    message = `${nl}${sep}${nl}timestamp:${this.toJSONLocal(new Date())}${nl}message:${message}${nl}`;
    console.log(message);
  }

  logError(error, msg) {
    let message = msg;
    const nl = '\r\n';
    const sep = '--------------------';
    message = `message:${message}${nl}`;
    if (!message) {
      message = '';
    }

    message = `${nl}${sep}${nl}timestamp:${this.toJSONLocal(new Date())}${nl}name:${error.name}${nl}${message}${error.stack}${nl}${error.message}${nl}${sep}${nl}`;

    this.trace(message);
  }
}

module.exports = Logger;

