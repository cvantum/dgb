//
// Commands for get / set data via Challonge-API
//

"use strict";
var fs = require("fs");
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var co = require('co');


class ChallongeCore {
	constructor(config) {
		var self = this;
		self.config = config;
		console.log("Starting Challonge-Core");
	}
	// Grant Access to Admin-Commands
	mongoGrantAdmin(url,serverId,callback) {
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

exports.ChallongeCommands = class ChallongeCommands extends ChallongeCore {
	constructor(config) {
		super(config);
		var self = this;
		self.url = 'mongodb://'+config.mongodb_user+':'+config.mongodb_pass+'@localhost:20729/'+config.mongodb+'?authMechanism=DEFAULT&authSource='+config.mongodb;
	}

	getUserCommands() {
		var self = this;
		var commands = {

		}
		return commands;
	}
