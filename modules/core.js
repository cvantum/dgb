// 
// Mappool-System zur Auswahl von Maps für ein Wettkampf
//

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var co = require('co');

class MongoCommands {
	constructor() {
		console.log('Staring Mongo-Commands (if i need them)');
	}
}

exports.Commands = class Commands extends MongoCommands{
	constructor(config) {
		super();
		this.config = config;
		this.url = 'mongodb://'+config.mongodb_user+':'+config.mongodb_pass+'@localhost:20729/'+config.mongodb+'?authMechanism=DEFAULT&authSource='+config.mongodb;
	}

	//Update Server-Collection at Start
	mongoUpdateServer(serverArray) {
		var url = this.url;
		co(function* () {
			var db = yield MongoClient.connect(url);
			console.log("Connected correctly to MongoDB");
			var col = db.collection('server');
			var result = yield col.find({}).toArray();
			//console.log(result);
			for (var server in serverArray) {
				for (var dbServer in result) {
					console.log(result[dbServer]['server_id']);
					console.log(serverArray[server]['server_id']);
					if (result[dbServer]['server_id'] !== serverArray[server]['server_id']) {
						console.log('Did not found data for: '+serverArray[server]['server_name']);
						//var update = yield col.insertOne(serverArray[server]);
						//assert.equal(1,update.insertedCount);
					}
				}
			}
			db.close();
		}).catch( function(err) {
			console.log(err);
		});
	}
	//Update new Server on Event 'server-created'
	mongoUpdateOnCreated(server) {
		var url = this.url;
		co(function* () {
			var db = yield MongoClient.connect(url);
			console.log("Connected correctly to MongoDB");
			var col = db.collection('server');
			var result = yield col.find({}).toArray();
			//console.log(result);
			var update = yield col.insertOne(server);
			assert.equal(1,update.insertedCount);
			db.close();
		}).catch( function(err) {
			console.log(err);
		});
	}
	//Find Discord-Server by ID
	mongoFindServer(serverId,callback) {
		var url = this.url;
		co(function* () {
			var db = yield MongoClient.connect(url);
			console.log("Connected correctly to MongoDB");
			var col = db.collection('server');
			var result = yield col.find({"server_id" : serverId}).toArray();
			//console.log(result);
			callback(result);
			db.close();
		}).catch( function(err) {
			console.log(err);
		});
	}
}
