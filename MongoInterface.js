require('dotenv-extended').load();
const MongoClient = require('mongodb').MongoClient;
const Address = process.env.MONGODB_ADDRESS;

module.exports = class DB {
	async insert(collName, object, callback = () => { }) {
		await MongoClient.connect(Address, (err, db) => {
			db.collection(collName).insertOne(object, (err, result) => {
				if (err) throw err;
				db.close();
				callback();
			});
		});
	}
	async insertMany(collName, object, callback) {
		MongoClient.connect(Address, (err, db) => {
			db.collection(collName).insertMany(object, (err, res) => {
				if (err) throw err;
				db.close();
				callback();
			});
		});
	}
	async findOne(collName, condition, callback = () => { }) {
		await MongoClient.connect(Address, (err, db) => {
			if (err) throw err;
			db.collection(collName).findOne(condition, (err, result) => {
				if (err) throw err;
				db.close();
				callback(result);
			});
		});
	}
	async find(collName, condition, callback = () => { }) {
		await MongoClient.connect(Address, (err, db) => {
			if (err) throw err;
			db.collection(collName).find(condition).toArray((err, result) => {
				if (err) throw err;
				db.close();
				callback(result);
			});
		});
	}
	async updateOneDocument(collName, condition, updatedDocument, callback = () => { }) {
		await MongoClient.connect(Address, (err, db) => {
			if (err) throw err;
			db.collection(collName).updateOne(condition, updatedDocument, (err, res) => {
				if (err) throw err;
				db.close();
				callback();
			});
		});
	}
	async updateOneField(collName, condition, updatedField, callback = () => { }) {
		await MongoClient.connect(Address, (err, db) => {
			if (err) throw err;
			db.collection(collName).updateOne(condition, { $set: updatedField }, (err, res) => {
				if (err) throw err;
				db.close();
				callback();
			});
		});
	}
	async updateFields(collName, condition, updatedField, callback = () => { }) {
		await MongoClient.connect(Address, (err, db) => {
			if (err) throw err;
			db.collection(collName).updateMany(condition, { $set: updatedField }, (err, res) => {
				if (err) throw err;
				db.close();
				callback();
			});
		});
	}
	async deleteDocument(collName, condition, callback = () => { }) {
		await MongoClient.connect(Address, (err, db) => {
			if (err) throw err;
			db.collection(collName).deleteOne(condition, (err) => {
				if(err) throw err;
				db.close();
				callback();
			});
		});
	}
	async deleteManyDocuments(collName, condition, callback = () => { }) {
		await MongoClient.connect(Address, (err, db) => {
			if (err) throw err;
			db.collection(collName).deleteMany(condition, (err) => {
				if(err) throw err;
				db.close();
				callback();
			});
		});
	}
};