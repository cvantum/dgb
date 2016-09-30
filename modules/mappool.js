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
		var self = this;
		self.config = config;
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
			var result = yield col.find({"server_id" : serverId}).toArray();
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
		var self = this;
		self.lockedServers = {};
		self.url = 'mongodb://'+config.mongodb_user+':'+config.mongodb_pass+'@localhost:20729/'+config.mongodb+'?authMechanism=DEFAULT&authSource='+config.mongodb;
	}

	getUserCommands() {
		var self = this;
		var commands = {
			"start": {
				desc : "Starting Mappool-Wizard",
				example : "**Example:** ```\?start ift bo3```",
				process : function(bot,msg,values) {
					console.log(values);
					if (msg.channel.type === 'text') {
						self.mongoActiveModule(self.url,msg.guild.id,function(response) {
							var responseMsg = [];
							if (response.length === 0) {
								responseMsg.push("Looks like this Server didn't activated the Mappool-Wizard");
							} else if (self.lockedServers.hasOwnProperty(msg.guild.id)) {
								responseMsg.push("Mappool-Wizard already started");
							} else if (values.length === 2) {
								//console.log(response[0]["games"][values[0]]["pick-modes"][values[1]]);
								if (!response[0]["games"].hasOwnProperty(values[0])) {
									responseMsg.push("Didn't found any game called: "+values[0]);
								} else if (!response[0]["games"][values[0]]["pick_modes"].hasOwnProperty(values[1])) {
									responseMsg.push("Didn't found any mode called: "+values[1]);
								} else {
									var server = self.getTempDataMethod();
									console.log(server);
									server['isLocked'] = true;
									server['lockedPlayer'] = msg.author.id;
									server['player_a'] = msg.author;
									server['bo_mode'] = response[0]["games"][values[0]]["pick_modes"][values[1]];
									server['mappool'] = response[0]["games"][values[0]]["mappool"];
									server['mappool_remain'] = response[0]["games"][values[0]]["mappool"];
									server['game'] = values[0];
									console.log(server);
									self.lockedServers[msg.guild.id] = server;
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
							msg.channel.sendMessage(responseMsg.join('\n'));
						});
					} else {
						msg.channel.sendMessage("You can't start this process in DM");
					}
				}
			},
			"opponent" : {
				desc : "Register as second player to voting",
				example : "**Example:** ```\?opponent```",
				process : function(bot,msg,values) {
					var response = [];
					if (msg.channel.type !== 'text') {
						response.push("You can't add yourself to the process with a DM");
					} else if (!self.lockedServers.hasOwnProperty(msg.guild.id)) {
						response.push("Looks like there is no voting started, use  **\?start**");
					//} else if (self.lockedServers[msg.guild.id]['lockedPlayer'] === msg.author.id) {
					//	response.push("You can't be both players");
					} else {
						self.lockedServers[msg.guild.id]['player_b'] = msg.author;
						response.push("Okay. We have two players in here. Let me make a cointoss");
						if (self.cointoss() === 0) {
							console.log('Cointoss-Winner = Player A');
							self.lockedServers[msg.guild.id]['curr_voter'] = self.lockedServers[msg.guild.id]['player_a'];
							self.lockedServers[msg.guild.id]['next_voter'] = self.lockedServers[msg.guild.id]['player_b'];
							self.lockedServers[msg.guild.id]['cointoss_winner'] = self.lockedServers[msg.guild.id]['player_a'].username;
							response.push("Winner of cointoss is: "+self.lockedServers[msg.guild.id]['player_a'].toString());
							response.push("You can start with **\?"+self.lockedServers[msg.guild.id]['bo_mode'][0]+'**');
						} else {
							console.log('Cointoss-Winner = Player B');
							self.lockedServers[msg.guild.id]['curr_voter'] = self.lockedServers[msg.guild.id]['player_b'];
							self.lockedServers[msg.guild.id]['next_voter'] = self.lockedServers[msg.guild.id]['player_a'];
							self.lockedServers[msg.guild.id]['cointoss_winner'] = self.lockedServers[msg.guild.id]['player_b'].username;
							response.push("Winner of cointoss is: "+self.lockedServers[msg.guild.id]['player_b'].toString());
							response.push("You can start with **\?"+self.lockedServers[msg.guild.id]['bo_mode'][0]+'**');
						}
					}
					console.log(self.lockedServers);
					msg.channel.sendMessage(response.join('\n'));

				}
			},
			"abort" : {
				desc : "Abort voting",
				example : "**Example:** ```\?abort```",
				process : function(bot,msg,values) {
					var response = [];
					if (msg.channel.type !== 'text') {
						response.push("You can't abort the process with a DM");
					} else if (self.lockedServers.hasOwnProperty(msg.guild.id) && self.lockedServers[msg.guild.id]['lockedPlayer'] === msg.author.id) {
						delete self.lockedServers[msg.guild.id];
						response.push("Aborted Mappool-Wizard");
					} else if (self.lockedServers.hasOwnProperty(msg.guild.id) && self.lockedServer['lockedPlayer'] !== msg.author.id) {
						response.push("You are not allowed to cancel the Mappool-Wizard");
					}
					msg.channel.sendMessage(response.join('\n'));
				}
			},
			"done" : {
				desc : "Close voting",
				example : "**Example:** ```\?done```",
				process : function(bot,msg,values) {
					var response = [];
					if (msg.channel.type !== 'text') {
						response.push("You can't saving the process with a DM");
					} else if (self.lockedServers.hasOwnProperty(msg.guild.id) && self.lockedServers[msg.guild.id]['lockedPlayer'] === msg.author.id) {
						delete self.lockedServers[msg.guild.id];
						response.push("Saved finished  Mappool-Wizard");
					} else if (self.lockedServers.hasOwnProperty(msg.guild.id) && self.lockedServer['lockedPlayer'] !== msg.author.id) {
						response.push("You are not allowed to unlock the Mappool-Wizard");
					}
					msg.channel.sendMessage(response.join('\n'));
				}
			},
			"mappool" : {
				desc : "List current mappool",
				example : "**Example:** ```\?mappool | \?mappool <game>```",
				process : function(bot,msg,values) {
					var response = [];
					if (msg.channel.type !== 'text') {
						response.push("You can't get any results in DM");
					} else if (!self.lockedServers.hasOwnProperty(msg.guild.id)) {
						response.push("There is no process running at the moment");
					} else {
						response.push("**List of current mappool**");
						response.push(self.lockedServers[msg.guild.id]['mappool_remain'].join('\n'));
						response.push("**List of dropped mappool**");
						response.push(self.lockedServers[msg.guild.id]['mappool_dropped'].join('\n'));
					}
					msg.channel.sendMessage(response.join('\n'));
				}
			},
			"pick" : {
				desc : "Pick a map (if it's your turn)",
				example : "**Example:** ```\?pick <number>```",
				process : function(bot,msg,values) {
					var response = [];
					console.log(self.lockedServers);
					if (msg.channel.type !== 'text') {
						response.push("You can't pick a map in DM");
					} else if (!self.lockedServers.hasOwnProperty(msg.guild.id)) {
						response.push("There isn't something you can vote");
					} else if (isNaN(values[0])) {
						response.push("Please just write down a number");
					} else if (self.lockedServers[msg.guild.id]['curr_voter'] === msg.author && self.lockedServers[msg.guild.id]['bo_mode'][self.lockedServers[msg.guild.id]['turn_number']] === 'pick') {
						console.log("Voter: "+msg.author.id+"picked "+self.lockedServers[msg.guild.id]['mappool'][Number(values[0])]);
						self.lockedServers[msg.guild.id]['mappool_voted'].push(self.lockedServers[msg.guild.id]['mappool_remain'][Number(values[0])]);
						self.lockedServers[msg.guild.id]['mappool_remain'].pop(self.lockedServers[msg.guild.id]['mappool_remain'][Number(values[0])]);
						self.lockedServers[msg.guild.id]['turn_number'] += 1;
						self.lockedServers[msg.guild.id]['curr_voter'] = self.lockedServers[msg.guild.id]['next_voter'];
						self.lockedServers[msg.guild.id]['next_voter'] = msg.author;
						response.join("Thanks for your vote");
						response.join("Remaining mappool:");
						for (var maps in self.lockedServers[msg.guild.id]['mappool_remain']) {
							//console.log(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_remain'][maps]);
							response.push(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_remain'][maps]);
						}
					}
					msg.channel.sendMessage(response.join('\n'));
					if (self.lockedServers[msg.guild.id]['turn_number'] === self.lockedServers[msg.guild.id]['bo_mode'].length) {
						console.log("Reached end of votes");
						msg.channel.sendMessage("Reached end of votes");
					} else {
						console.log("Go ahead with next vote");
						msg.channel.sendMessage("Okay, "+self.lockedServers[msg.guild.id]['curr_voter'].toString()+ "it's your turn with: **"+self.lockedServers[msg.guild.id]['bo_mode'][self.lockedServers[msg.guild.id]['turn_number']]+"**");
					}
				}
			},
			"drop" : {
				desc : "Drop a map (if it's your turn)",
				example : "**Example:** ```\?drop <number>```",
				process : function(bot,msg,values) {
					var response = [];
					console.log(self.lockedServers);
					//console.log(msg.author);
					//console.log(self.lockedServers[msg.guild.id]);
					if (msg.channel.type !== 'text') {
						response.push("You can't drop a map in DM");
					} else if (!self.lockedServers.hasOwnProperty(msg.guild.id)) {
						response.push("There isn't something you can vote");
					} else if (isNaN(values[0])) {
						response.push("Please just write down a number");
					} else if (self.lockedServers[msg.guild.id]['curr_voter'] === msg.author && self.lockedServers[msg.guild.id]['bo_mode'][self.lockedServers[msg.guild.id]['turn_number']] === 'drop') {
						console.log("Voter: "+msg.author.id+"dropped "+self.lockedServers[msg.guild.id]['mappool'][Number(values[0])]);
						self.lockedServers[msg.guild.id]['mappool_remain'].pop(self.lockedServers[msg.guild.id]['mappool_remain'][Number(values[0])]);
						self.lockedServers[msg.guild.id]['turn_number'] += 1;
						self.lockedServers[msg.guild.id]['curr_voter'] = self.lockedServers[msg.guild.id]['next_voter'];
						self.lockedServers[msg.guild.id]['next_voter'] = msg.author;
						response.join("Thanks for your vote");
						response.join("Remaining mappool:");
						for (var maps in self.lockedServers[msg.guild.id]['mappool_remain']) {
							//console.log(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_remain'][maps]);
							response.push(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_remain'][maps]);
						}
					}
					msg.channel.sendMessage(response.join('\n'));
					if (self.lockedServers[msg.guild.id]['turn_number'] === self.lockedServers[msg.guild.id]['bo_mode'].length) {
						console.log("Reached end of votes");
						msg.channel.sendMessage("Reached end of votes");
					} else {
						console.log("Go ahead with next vote");
						msg.channel.sendMessage("Okay, "+self.lockedServers[msg.guild.id]['curr_voter'].toString()+ "it's your turn with: **"+self.lockedServers[msg.guild.id]['bo_mode'][self.lockedServers[msg.guild.id]['turn_number']]+"**");
					}
				}
			},
			"voted" : {
				desc : "Show voted / dropped maps",
				example : "**Example:** ```\?voted```",
				process : function(bot,msg,values) {
					var response = [];
					if (msg.channel.type !== 'text') {
						response.push("You can't get any result in DM");
					} else if (!self.lockedServers.hasOwnProperty(msg.guild.id)) {
						response.push("There is no process running at the moment");
					} else {
						response.push("**List of voted maps:**");
						response.push(self.lockedServers[msg.guild.id]['mappool_voted'].join('\n'));
					}
					msg.channel.sendMessage(response.join('\n'));
				}
			},
			"show" : {
				desc : "Show stored modes and mappool for this server",
				example : "**Example:** ```\?show mappools | modes```",
				process : function (bot,msg,values) {
					if (msg.channel.type !== 'text') {
						msg.channel.sendMessage("You can't get any result in DM");
					} else {
						self.mongoFindServer(self.url,msg.guild.id,function(response) {
							var responseMsg = [];
							if (values.length === 0) {
								msg.channel.sendMessage("Please say what i should show you\n```\?show mappools | modes```");
							} else if (values[0] === 'mappool') {
								console.log(response[0].games);
								for (var game in response[0].games) {
									console.log(game);
									console.log(response[0].games[game]);
									responseMsg.push('**'+game+':**');
									responseMsg.push('Mappool:');
									responseMsg.push('```'+response[0].games[game].mappool.join('\n')+'```');
								}
							} else if (values[0] === 'modes') {
								console.log(response[0].games);
								for (var game in response[0].games) {
									console.log(game);
									console.log(response[0].games[game]);
									responseMsg.push('**'+game+':**');
									responseMsg.push('Pick-Drop for round:');
									responseMsg.push('```'+response[0].games[game].mappool.join('\n')+'```');
								}
							} else if (values.length === 2) {
								console.log("Testtest");
							} else {
								console.log("Unknown value");
							}
							//console.log(response[0]);
							//console.log(msg.author.id);
							//console.log(values.length);
							console.log('show abfrage by: ' + msg.author.username );
							msg.channel.sendMessage(responseMsg.join('\n'));
						});
					}
				}
			}
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
						self.mongoGrantAdmin(self.url,msg.guild.id,function(response) {
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
