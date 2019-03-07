const Storage = require('./storage.js');

console.log('Downloading files...');

Storage.downloadMany('sounds/').then(() => {
    console.log('Completed downloading...');
    File.readFs(callback);
});