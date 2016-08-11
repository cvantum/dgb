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
	// Seach for valid game and pick-mode
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
	// Find specified Server
	mongoFindServer(url,serverId,callback) {
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
	// Update Specified Server
	mongoUpdateServer(url,serverId,data,callback) {
		co(function* () {
			var db = yield MongoClient.connect(url);
			console.log("Connected correctly to MongoDB");
			var col = db.collection('server');
			var result = yield col.updateOne({"server_id" : serverId}, {$set: data });
			assert.equal(1, r.matchedCount);
			assert.equal(1, r.modifiedCount);
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
									server['player_a'] = msg.author;
									server['bo_mode'] = response[0]["games"][values[0]]["pick_modes"][values[1]];
									server['mappool'] = response[0]["games"][values[0]]["mappool"];
									server['mappool_remain'] = response[0]["games"][values[0]]["mappool"];
									server['game'] = values[0];
									console.log(server);
									that.lockedServers[msg.server.id] = server;
									responseMsg.push("**Successfully started Mappool-Wizard**");
									//responseMsg.push("**Mappool is:**\n"+response[0]["games"][values[0]]["mappool"].join("\n"));
									responseMsg.push("**Mappool is:**");
									for (var map in response[0]["games"][values[0]]["mappool"]) {
										responseMsg.push(String(Number(map)+1)+": "+response[0]["games"][values[0]]["mappool"][map]);
									}
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
					if (msg.server === undefined) {
						response.push("You can't add yourself to the process with a PM");
					} else if (!that.lockedServers.hasOwnProperty(msg.server.id)) {
						response.push("Looks like there is no voting started, use  **\?start**");
					} else if (that.lockedServers[msg.server.id]['lockedPlayer'] === msg.author.id) {
						response.push("You can't be both players");
					} else {
						that.lockedServers[msg.server.id]['player_b'] = msg.author;
						response.push("Okay. We have two players in here. Let me make a cointoss");
						if (that.cointoss() === 0) {
							console.log('Cointoss-Winner = Player A');
							that.lockedServers[msg.server.id]['curr_voter'] = that.lockedServers[msg.server.id]['player_a']
							that.lockedServers[msg.server.id]['next_voter'] = that.lockedServers[msg.server.id]['player_b']
							response.push("Winner of cointoss is: "+that.lockedServers[msg.server.id]['player_a'].toString());
							response.push("You can start with **\?"+that.lockedServers[msg.server.id]['bo_mode'][0]+'**');
						} else {
							console.log('Cointoss-Winner = Player B');
							that.lockedServers[msg.server.id]['curr_voter'] = that.lockedServers[msg.server.id]['player_b']
							that.lockedServers[msg.server.id]['next_voter'] = that.lockedServers[msg.server.id]['player_a']
							response.push("Winner of cointoss is: "+that.lockedServers[msg.server.id]['player_b'].toString());
							response.push("You can start with **\?"+that.lockedServers[msg.server.id]['bo_mode'][0]+'**');
						}
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
				example : "**Example:** ```\?done```",
				process: function(bot,msg,values) {
					var response = [];
					if (msg.server === undefined) {
						response.push("You can't saving the process with a PM");
					} else if (that.lockedServers.hasOwnProperty(msg.server.id) && that.lockedServers[msg.server.id]['lockedPlayer'] === msg.author.id) {
						delete that.lockedServers[msg.server.id];
						response.push("Saved finished  Mappool-Wizard");
					} else if (that.lockedServers.hasOwnProperty(msg.server.id) && that.lockedServer['lockedPlayer'] !== msg.author.id) {
						response.push("You are not allowed to unlock the Mappool-Wizard");
					}
					bot.sendMessage(msg.channel,response.join('\n'));
				}	
			},
			"mappool" : {
				desc : "List current mappool",
				example : "**Example:** ```\?mappool | \?mappool <game>```"},
			"pick" : { 
				desc : "Pick a map (if it's your turn)",
				example : "**Example:** ```\?pick <number>```",
				process: function(bot,msg,values) {
					var response = [];
					if (msg.server === undefined) {
						response.push("You can't pick a map in PM");
					} else if (!that.lockedServers.hasOwnProperty(msg.server.id)) {
						response.push("There isn't something you can vote");
					} else if (isNaN(values[0])) {
						response.push("Please just write down a number");
					} else if (that.lockedServers[msg.server.id]['curr_player'] === msg.author && 
					that.lockedServers[msg.server.id]['bo_mode'][that.lockedServers[msg.server.id]['turn_number']] === 'pick') {
						console.log("Voter: "+msg.author.id+"picked "+that.lockedServers[msg.server.id]['mappool'][Number(values[0])]);
						that.lockedServers[msg.server.id]['mappool_voted'].push(that.lockedServers[msg.server.id]['mappool'][Number(values[0])])
					}
					bot.sendMessage(msg.channel,response.join('\n'));
					if (that.lockedServers[msg.server.id]['turn_number'] === that.lockedServers[msg.server.id]['bo_mode'].length) {
						console.log("Reached end of votes");
					} else {
						console.log("Go ahead with next vote");
					}
				}
			},
			"drop" : {
				desc : "Drop a map (if it's your turn)",
				example : "**Example:** ```\?drop <number>```",
				process: function(bot,msg,values) {
					var response = [];
					if (msg.server === undefined) {
						response.push("You can't drop a map in PM");
					} else if (!that.lockedServers.hasOwnProperty(msg.server.id)) {
						response.push("There isn't something you can vote");
					} else if (isNaN(values[0])) {
						response.push("Please just write down a number");
					} else if (that.lockedServers[msg.server.id]['curr_player'] === msg.author && 
					that.lockedServers[msg.server.id]['bo_mode'][that.lockedServers[msg.server.id]['turn_number']] === 'pick') {
						console.log("Voter: "+msg.author.id+"dropped "+that.lockedServers[msg.server.id]['mappool'][Number(values[0])]);
					}
					bot.sendMessage(msg.channel,response.join('\n'));
					if (that.lockedServers[msg.server.id]['turn_number'] === that.lockedServers[msg.server.id]['bo_mode'].length) {
						console.log("Reached end of votes");
					} else {
						console.log("Go ahead with next vote");
					}
				}
			},
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
			'player_a' : {},
			'player_b' : {},
			'cointoss_winner': '',
			'bo_mode' : [],
			'game' : '',
			'turn_number' : 0,
			'curr_voter' : {},
			'next_voter' : {},
			'mappool' : [],
			'mappool_remain' : [],
			'mappool_voted' : [],
			'mappool_dropped' : []
			};
	}
}
