const config = require('../config.json');
const MongoClient = require('mongodb').MongoClient;

class Database {

  static run(func) {
    MongoClient.connect(config.mongo, (err, db) => {
      if (err) {
        throw err;
      }
      func(db);
    });
  }

  static load(id, target, cb) {
    Database.run((db) => {
      const collection = db.collection(target);
      collection.aggregate([{ $match: id }]).toArray((err, items) => {
        cb(items);
      });
    });
  }

  static update(id, val, target, cb) {
    Database.run((db) => {
      const collection = db.collection(target);
      collection.updateOne(id, val, { upsert: true }, (err, items) => {
        cb(items);
      });
    });
  }

  static insert(item, target) {
    Database.run((db) => {
      db.collection(target).insert(item, () => {
        db.close();
      });
    });
  }

  static loadMany(target, cb) {
    Database.run((db) => {
      const collection = db.collection(target);
      collection.find({}).toArray((err, items) => {
        cb(items);
      });
    });
  }

  static saveMany(items, target) {
    Database.run((db) => {
      db.collection(target).insertMany(items, () => {
        db.close();
      });
    });
  }
}

module.exports = Database;
