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

	getAdminCommands() {
		var self = this;
		var commands = {
			"addGame" : {
				desc : "Add a new game to Wizard",
				example : "**Example:** ```\?admin addGame <game>```",
				process : function(bot,msg,values) {
						console.log(self.url);
						self.mongoGrantAdmin(self.url,msg.server.id,function(response) {
							console.log(response[0]);
							console.log(msg.author.id);
							console.log(response[0]['admins']);
							if (response[0]['admins'].indexOf(msg.author.id) > -1) {
								msg.channel.sendMessage("You have granted admin-access");
							} else {
								msg.channel.sendMessage("You are not a admin for this server");
							}
							console.log('admin-access abfrage by: ' + msg.author.username );
						});
					}
				},
			"delGame" : {
				desc : "Delete a game from Wizard",
				example : "**Example:** ```\?admin delGame <game>```",
			},
			"addVote" : {
				desc : "Add a pick-drop mode to a game"},
			"delVote" : {
				desc : "Delete a pick-drop mode from a game"},
			"updateVote" : {
				desc : "Update a pick-drop mode"},
			"addPool" : {
				desc : "Add a mappool for a game"},
			"delPool" : {
				desc : "Delete a mapool for a game"},
			"updatePool" : {
				desc : "Update a mapoool for a game"}
		}
		return commands;
	}
