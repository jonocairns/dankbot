const AWS = require('aws-sdk');
const fs = require('fs');
const TestConfig = require('../../env.json');
const Promise = require('promise');
const request = require('request');

AWS.config.region = 'us-west-2';

if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_SECRET_ACCESS_KEY) {
	process.env.AWS_ACCESS_KEY_ID = TestConfig.AWS_ACCESS_KEY_ID;
	process.env.AWS_SECRET_ACCESS_KEY = TestConfig.AWS_SECRET_ACCESS_KEY;
}

class Storage {

	static upload(url, fileName, cb) {
		// downloading file to active instance
		const location = `sounds/${fileName}`;
		console.log(`downloading ${url} to ${location}`);
		const stream = request(url).pipe(fs.createWriteStream(location));
		stream.on('finish', () => {
			console.log('Completed sound download to server...');
			const body = fs.createReadStream(location);
			const name = location.split('/').pop();
			console.log(`uploading ${name} to AWS.`);
			const s3obj = new AWS.S3({ params: { Bucket: 'dankbot', Key: name } });
			s3obj.upload({ Body: body })
			.on('httpUploadProgress', (evt) => { console.log(evt); })
			.send((err, data) => { console.log(err, data); cb(err, data); });
		});
	}

	static listContentsOfBucket(cb) {
		const s3obj = new AWS.S3();
		s3obj.listObjects({ Bucket: 'dankbot' }, (err, data) => {
			cb(err, data.Contents);
		});
	}

	static downloadMany(downloadLocation) {
        // download location could be something like ../sounds/
		if (!fs.existsSync(downloadLocation)) {
			fs.mkdirSync(downloadLocation);
		}

		return new Promise((resolve, reject) => {
			Storage.listContentsOfBucket((err, data) => {
				if (err) { reject(err); }

				const fileDownloadPromises = [];
				data.forEach((item) => {
					fileDownloadPromises.push(Storage.download(item.Key, downloadLocation + item.Key, () => { }));
				});
				Promise.all(fileDownloadPromises).then(() => { resolve(); });
			});
		});
	}

	static download(file, filePath) {
		const s3 = new AWS.S3();
		const params = { Bucket: 'dankbot', Key: file };
		const f = fs.createWriteStream(filePath);

		return new Promise((resolve, reject) => {
			f.on('close', () => { resolve(); });
			s3.getObject(params).createReadStream().on('error', (err) => {
				console.log(err);
				reject(err);
			}).pipe(f);
		});
	}

	static store() {
        // look in to this to replace mongo
		const s3 = new AWS.S3();
		s3.createBucket(() => {
			const params = { Key: 'myKey', Body: 'Hello!' };
			s3.upload(params, (err, data) => {
				if (err) {
					console.log('Error uploading data: ', err);
				} else {
					console.log('Successfully uploaded data to myBucket/myKey');
					console.log(data);
				}
			});
		});
	}
}

module.exports = Storage;
