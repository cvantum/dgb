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
	getInformations(values) {
		console.log(values);
	}
}

exports.Commands = class Commands extends MongoCommands{
	constructor(config) {
		super();
		this.config = config;
		this.url = 'mongodb://'+config.mongodb_user+':'+config.mongodb_pass+'@localhost:20729/'+config.mongodb+'?authMechanism=DEFAULT&authSource='+config.mongodb;
	}
	//Entry-Point for Admin-Commands
	getAdminCommands() {
		var self = this;
		var url = this.url;
		var commands = {
			"info" : {
				desc : "Get stored informations about this discord-server",
				process: function(bot,msg,values) {
					self.mongoFindServer("115554690686648327",function(response) {
						console.log(response[0]);
						if (response[0]['admins'].indexOf(msg.author.id) > -1) {
							msg.channel.sendMessage("You have granted admin-access");
						} else {
							msg.channel.sendMessage("You are not a admin for this server");
						}
						console.log('admin-info abfrage by: ' + msg.author.username );
					});
				}
			}
		}
		return commands;
	}
	//Entry-Point for User-Commands
	getUserCommands() {
		var self = this;
		var url = this.url;
		var commands = {
			"info" : {
				desc : "Get details of bot, developer and further informations",
				process: function(bot,msg,values) {
					var response = [];
					var infoText = 'Uptime: ';
					var time = bot.uptime;
					var numSec = time / 1000;
					var hour = Math.floor(numSec / 3600);
					var minute = Math.floor( ((numSec - (hour * 3600))/60) );
					var second = numSec - (hour*3600) - (minute*60);

					infoText += hour.toString() + ' hour(s), ';
					infoText += minute.toString() + ' minute(s) ';
					infoText += second.toString().split('.')[0] + ' second(s) \n';
					response.push(infoText);
					response.push('Repository: https://github.com/cvantum/dgb');
					response.push('For help, issues and feature-requests send a message to **\@cvantum**');
					msg.channel.sendMessage(response.join('\n'));
					// Log to console
					console.log('info abfrage by: ' + msg.author.username );
				}
			}
		}
		return commands;
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
