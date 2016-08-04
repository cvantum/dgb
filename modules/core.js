//
// Mappool-System zur Auswahl von Maps für ein Wettkampf
//

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

class MongoCommands {
	constructor() {
		console.log('Staring Mongo-Commants');
	}
	//Insert into Collection "server"
	mongoUpdateServer(db,callback) {
	}
	//Insert into Collection "user"
	mongoUpdateUser(db,callback) {
	}
	//Find Discord-Server by ID
	mongoFindServer(db,callback) {
		var collection = db.collection('server');
		collection.find({}).toArray(function(err, docs) {
			assert.equal(err, null);
			console.log("Found the following records");
			console.log(docs)
			callback(docs);
		});
	}
	//Find User by Discord-ID
	mongoFindUser(db,callback) {
	}
}


exports.Commands = class Commands extends MongoCommands{
	constructor(config) {
		super();
		this.config = config;
		this.url = 'mongodb://'+config.mongodb_user+':'+config.mongodb_pass+'@localhost:20729/'+config.mongodb+'?authMechanism=DEFAULT&authSource='+config.mongodb;
		this.testConnect();
	}
	//Test MongoDB-Connection
	testConnect() {
		MongoClient.connect(this.url, function(err, db) {
			assert.equal(null, err);
			console.log("Connected correctly to server.");
			db.close();
		});
	}

	//Opening the MongoDB-Connection
	incoming(msg) {
		console.log(this.url);
		MongoClient.connect(this.url, function(err, db) {
			assert.equal(null, err);
			console.log("Connected correctly to server");
			var collection = db.collection('server');
			collection.find({}).toArray(function(err, docs) {
				assert.equal(err, null);
				console.log(docs);
				});
			//this.mongoFindServer(db, function() {
			//	db.close();
			//});
		});
	}

	response(answer) {
		console.log(answer);
	}
	//Find Discord-Server by ID
	mongoFindServer(db,callback) {
		//var collection = db.collection('server');
		//collection.find({}).toArray(function(err, docs) {
		//	assert.equal(err, null);
		//	console.log("Found the following records");
		//	console.log(docs)
		//	callback(docs);
		//});
	}
}
