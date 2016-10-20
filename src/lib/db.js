'use strict';
const config = require('../config.json');
const MongoClient = require('mongodb').MongoClient;

class Database {
    constructor() {
    }

    run(func) {
        MongoClient.connect(config.mongo, function(err, db) {
            if(err) {
                throw err;
            }          
            func(db);
        });
    }

    load(id, target, cb) {
        this.run((db) => {
            var collection = db.collection(target);
            collection.aggregate([{$match: id}]).toArray((err, items) => {
                cb(items);
            });
        });
    }

    update(id, val, target, cb) {
        this.run((db) => {
            var collection = db.collection(target);
            collection.updateOne(id, val, { upsert: true },(err, items) => {
                cb(items);
            });
        });
    }

    insert(item, target) {
        this.run((db) => {
            db.collection(target).insert(item, () => {
                db.close();
            });
        });
    }

    loadMany(target, cb) {
        this.run((db) => {
            var collection = db.collection(target);
            collection.find({}).toArray((err, items) => {
                cb(items);
            });
        });
    }

    saveMany(items, target) {
        this.run((db) => {
            db.collection(target).insertMany(items, () => {
                db.close();
            });
        });
    }
}

module.exports = Database;