const MongoClient = require('mongodb').MongoClient;

class Database {
	static run(func) {
		try {
			MongoClient.connect(process.env.DANK_MONGODB, (err, db) => {
				if (err) {
					throw err;
				}
				func(db);
			});
		} catch (err) {
			console.log('There was db issue. See stack trace for details');
			console.error(err);
		}
	}

	static load(id, target, cb) {
		Database.run((db) => {
			const collection = db.collection(target);
			collection.aggregate([{ $match: id }]).toArray((err, items) => {
				if (cb) cb(items);
			});
		});
	}

	static update(id, val, target, cb) {
		Database.run((db) => {
			const collection = db.collection(target);
			collection.updateOne(id, val, { upsert: true }, (err, items) => {
				if (cb) cb(items);
			});
		});
	}

	static insert(target, item, cb) {
		Database.run((db) => {
			db.collection(target).insert(item, () => {
				db.close();
				if (cb) cb();
			});
		});
	}

	static loadMany(target, cb) {
		Database.run((db) => {
			const collection = db.collection(target);
			collection.find({}).toArray((err, items) => {
				if (cb) cb(items);
			});
		});
	}

	static saveMany(target, items, cb) {
		Database.run((db) => {
			db.collection(target).insertMany(items, () => {
				db.close();
				if (cb) cb();
			});
		});
	}

	static deleteAll(target) {
		Database.run((db) => {
			db.collection(target).remove();
		});
	}

	static delete(id, target, cb) {
		Database.run((db) => {
			db.collection(target).remove(id, (err, numberOfRemoved) => {
				if (cb) cb(numberOfRemoved);
			});
		});
	}
}

module.exports = Database;
