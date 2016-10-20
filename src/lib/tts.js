const Logger = require('./logger.js');

class Tts {
  constructor() {
    this.logger = new Logger();
  }

  static process(message, commands) {
    // cmd will be !bot tts "content" cmd
    const empty = {
      content: '',
      cmd: '',
      isEmpty: true,
    };
    try {
      // get the "content" inside double quotes
      const content = message.content.match(/"(.*?)"/)[0];
      if (content.length === 0) {
        message.channel.sendMessage('Do it properly.');
        return empty;
      }
            // remove quotes
      const replaced = content.replace('"', '').replace('"', '');
            // find the last quote and get the index of the next character
      const indexOfLastQuote = message.content.lastIndexOf('"') + 1;
            // get the final parameter (from the last index of the quote to the end of the string)
      const localCmd = message.content.substr(indexOfLastQuote);
            // remove any spaces
      let splitCmd = localCmd.replace(/ /g, '');
            // replace the ! prefix if it's there
      splitCmd = splitCmd.replace('!', '');

            // check if the commant already exists
      let cmdExists = false;
      commands.forEach((fileName, command) => {
        const test = `!${splitCmd}`;
        if (test.match(command)) {
          cmdExists = true;
        }
      });

      if (cmdExists) {
        message.channel.sendMessage('That command already exists you dickface.');
      }

      if (content.length && indexOfLastQuote !== -1 && !cmdExists) {
        return {
          content: replaced,
          cmd: splitCmd,
          isEmpty: false,
        };
      }

      return empty;
    } catch (err) {
      this.logger.logError(err, 'fail');
      message.channel.sendMessage('Something bad happened. Try again niggah. use (exclamation)bot tts "some text" (exclamation)bind');
      return empty;
    }
  }
}


module.exports = Tts;
