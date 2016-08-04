//
// Mappool-System zur Auswahl von Maps für ein Wettkampf
//

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');


exports.Commands = class Commands {
	constructor(config) {
		this.config = config;
		this.url = 'mongodb://'+config.mongodb_user+':'+config.mongodb_pass+'@localhost:20729/?authMechanism=DEFAULT&authSource='+config.mongodb;
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
	//Insert into Collection "server"
	mongoUpdateServer() {
	}

	//Insert into Collection "user"
	mongoUpdateUser() {
	}
	//Find Discord-Server by ID
	mongoFindServer() {
	}
	//Find User by Discord-ID
	mongoFindUser() {
	}
}
