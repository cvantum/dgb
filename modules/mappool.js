//
// Mappool-System zur Auswahl von Maps für ein Wettkampf
//

"use strict";
var fs = require("fs");
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var co = require('co');

class MappoolCore {
	constructor(config) {
		var that = this;
		that.config = config;
		console.log("Starting Mappool-Core");
	}
	cointoss() {
		return Math.floor(Math.random() * 2);
	}
	//Grant Access to Admin-Commands
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
	//Seach for valid game and pick-mode
	mongoActiveModule(url,serverId,callback) {
		co(function* () {
			var db = yield MongoClient.connect(url);
			console.log("Connected correctly to MongoDB");
			var col = db.collection('server');
			var result = yield col.find({"server_id" : serverId, "modules": {$in : ["mappool"]}}).toArray();
			callback(result);
			db.close();
		}).catch( function(err) {
			console.log(err);
		});
	}
}

exports.MappoolCommands = class MappoolCommands extends MappoolCore {
	constructor(config) {
		super(config);
		var that = this;
		that.lockedServers = {};
		that.url = 'mongodb://'+config.mongodb_user+':'+config.mongodb_pass+'@localhost:20729/'+config.mongodb+'?authMechanism=DEFAULT&authSource='+config.mongodb;
	}

	getUserCommands() {
		var that = this;
		var commands = {
			"start": {
				desc : "Starting Mappool-Wizard",
				example : "**Example:** ```\?start ift bo3```",
				process : function(bot,msg,values) {
					console.log(values);
					if (msg.server !== undefined) {
						that.mongoActiveModule(that.url,msg.server.id,function(response) {
							var responseMsg = [];
							if (response.length === 0) {
								responseMsg.push("Looks like this Server didn't activated the Mappool-Wizard");
							} else if (that.lockedServers.hasOwnProperty(msg.server.id)) {
								responseMsg.push("Mappool-Wizard already started");
							} else if (values.length === 2) {
								//console.log(response[0]["games"][values[0]]["pick-modes"][values[1]]);
								if (!response[0]["games"].hasOwnProperty(values[0])) {
									responseMsg.push("Didn't found any game called: "+values[0]);
								} else if (!response[0]["games"][values[0]]["pick_modes"].hasOwnProperty(values[1])) {
									responseMsg.push("Didn't found any mode called: "+values[1]);
								} else {
									var server = that.getTempDataMethod();
									console.log(server);
									server['isLocked'] = true;
									server['lockedPlayer'] = msg.author.id;
									server['player_a'] = msg.author.id;
									server['bo_mode'] = response[0]["games"][values[0]]["pick_modes"][values[1]];
									server['mappool'] = response[0]["games"][values[0]]["mappool"];
									server['game'] = values[1];
									that.lockedServers[msg.server.id] = server;
									responseMsg.push("**Successfully started Mappool-Wizard**");
									responseMsg.push("**Mappool is:**\n"+response[0]["games"][values[0]]["mappool"].join("\n"));
									responseMsg.push("**Voting-Mode is: **"+response[0]["games"][values[0]]["pick_modes"][values[1]].join("-"));
									responseMsg.push("First, we need a second player.");
									responseMsg.push("He can register himself with **\?opponent**");
								}
							} else {
								responseMsg.push("Looks like you have forgot something");
								responseMsg.push("**Example:** ```\?start ift bo3```");
							}
							bot.sendMessage(msg.channel,responseMsg.join('\n'));
						});
					} else {
						bot.sendMessage(msg.channel,"You can't start this process in PM");
					}
				}
			},
			"opponent" : {
				desc : "Register as second player to voting",
				example : "**Example:** ```\?opponent```",
				process : function(bot,msg,values) {
					var response = [];
					console.log(that.lockedServers);
					if (msg.server === undefined) {
						response.push("You can't add yourself to the process with a PM");
					} else if (!that.lockedServers.hasOwnProperty(msg.server.id)) {
						response.push("Looks like there is no voting started, use  **\?start**");
					} else if (that.lockedServers[msg.server.id]['lockedPlayer'] === msg.author.id) {
						response.push("You can't be both players");
					} else {
						that.lockedPlayers[msg.server.id]['player_b'] = msg.author.id;
						response.push("Okay. We have two players in here. Let me make a cointoss");
					}
					if (that.cointoss() === 0) {
						console.log('Cointoss-Winner = Player A');
					} else {
						console.log('Cointoss-Winner = Player B');
					}
					bot.sendMessage(msg.channel,response.join('\n'));
				}
			},
			"abort" : {
				desc : "Abort voting",
				example : "**Example:** ```\?abort```",
				process: function(bot,msg,values) {
					var response = [];
					if (msg.server === undefined) {
						response.push("You can't abort the process with a PM");
					} else if (that.lockedServers.hasOwnProperty(msg.server.id) && that.lockedServers[msg.server.id]['lockedPlayer'] === msg.author.id) {
						delete that.lockedServers[msg.server.id];
						response.push("Aborted Mappool-Wizard");
					} else if (that.lockedServers.hasOwnProperty(msg.server.id) && that.lockedServer['lockedPlayer'] !== msg.author.id) {
						response.push("You are not allowed to cancel the Mappool-Wizard");
					}
					bot.sendMessage(msg.channel,response.join('\n'));
				}
			},
			"done" : {
				desc : "Close voting",
				example : "**Example:** ```\?done```"},
			"mappool" : {
				desc : "List current mappool",
				example : "**Example:** ```\?mappool | \?mappool <game>```"},
			"pick" : { 
				desc : "Pick a map (if it's your turn)",
				example : "**Example:** ```\?pick <number>```"},
			"drop" : {
				desc : "Drop a map (if it's your turn)",
				example : "**Example:** ```\?drop <number>```"},
			"voted" : {
				desc : "Show voted / dropped maps",
				example : "**Example:** ```\?voted```"}
		}
		return commands;
	}
	getAdminCommands() {
		var that = this;
		var commands = {
			"addGame" : {
				desc : "Add a new game to Wizard",
				example : "**Example:** ```\?admin addGame <game>```",
				process : function(bot,msg,values) {
						console.log(that.url);
						that.mongoGrantAdmin(that.url,msg.server.id,function(response) {
							console.log(response[0]);
							console.log(msg.author.id);
							console.log(response[0]['admins']);
							if (response[0]['admins'].indexOf(msg.author.id) > -1) {
								bot.sendMessage(msg.channel,"You have granted admin-access");
							} else {
								bot.sendMessage(msg.channel,"You are not a admin for this server");
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

	getTempDataMethod() {
		return {
			'isLocked' : false,
			'lockedPlayer' : '',
			'player_a' : '',
			'player_b' : '',
			'cointoss_winner': '',
			'bo_mode' : [],
			'game' : '',
			'mappool' : []
			};
	}
	getTempGameMethod() {
		return {
			'pick-modes' : {},
			'mappool' : []
			};
	}
}
