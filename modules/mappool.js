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
							response.push("Or you can let your opponent make his first move with: **\?swap**");
							response.push("This command displays the dropped and untouched maps: **\?mappool**");
							response.push("This command displays the voted maps: **\?voted**");
						} else {
							console.log('Cointoss-Winner = Player B');
							self.lockedServers[msg.guild.id]['curr_voter'] = self.lockedServers[msg.guild.id]['player_b'];
							self.lockedServers[msg.guild.id]['next_voter'] = self.lockedServers[msg.guild.id]['player_a'];
							self.lockedServers[msg.guild.id]['cointoss_winner'] = self.lockedServers[msg.guild.id]['player_b'].username;
							response.push("Winner of cointoss is: "+self.lockedServers[msg.guild.id]['player_b'].toString());
							response.push("You can start with **\?"+self.lockedServers[msg.guild.id]['bo_mode'][0]+'**');
							response.push("Or you can let your opponent make his first move with: **\?swap**");
							response.push("This command displays the dropped and untouched maps: **\?mappool**");
							response.push("This command displays the voted maps: **\?voted**");
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
					} else {
						response.push("You are not allowed to cancel the Mappool-Wizard");
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
						//response.push(self.lockedServers[msg.guild.id]['mappool_remain'].join('\n'));
						for (var maps in self.lockedServers[msg.guild.id]['mappool_remain']) {
							//console.log(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_remain'][maps]);
							response.push(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_remain'][maps]);
						}
						response.push("**List of dropped mappool**");
						//response.push(self.lockedServers[msg.guild.id]['mappool_dropped'].join('\n'));
						for (var maps in self.lockedServers[msg.guild.id]['mappool_dropped']) {
							//console.log(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_dropped'][maps]);
							response.push(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_dropped'][maps]);
						}
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
						if (values[0] > 0 && values[0] <= self.lockedServers[msg.guild.id]['mappool_remain'].length) {
							console.log("Voter: "+msg.author.id+"picked "+self.lockedServers[msg.guild.id]['mappool'][Number(values[0])]);
							self.lockedServers[msg.guild.id]['mappool_voted'].push(self.lockedServers[msg.guild.id]['mappool_remain'][Number(values[0]-1)]);
							self.lockedServers[msg.guild.id]['mappool_remain'].splice(Number(values[0])-1,1);
							self.lockedServers[msg.guild.id]['turn_number'] += 1;
							self.lockedServers[msg.guild.id]['curr_voter'] = self.lockedServers[msg.guild.id]['next_voter'];
							self.lockedServers[msg.guild.id]['next_voter'] = msg.author;
							response.join("Thanks for your vote");
						} else {
							response.push("You vote is out of range, try again");
						}
						msg.channel.sendMessage(response.join('\n'));
						if (self.lockedServers[msg.guild.id]['turn_number'] === self.lockedServers[msg.guild.id]['bo_mode'].length) {
							response = [];
							console.log("Reached end of votes");
							self.lockedServers[msg.guild.id]['mappool_voted'].push(self.lockedServers[msg.guild.id]['mappool_remain'][0]);
							self.lockedServers[msg.guild.id]['mappool_remain'].pop();
							response.push('Congratulations, you have finished your mappool');
							response.push("*List of voted maps:*");
							response.push('```');
							response.push(self.lockedServers[msg.guild.id]['mappool_voted'].join(' - '));
							response.push('```');
							response.push("**Have fun and good luck :-)**");
							response.push('*This wizard is now closed and ready for a next vote*');
							msg.channel.sendMessage(response);
							delete self.lockedServers[msg.guild.id];
						} else {
							console.log("Go ahead with next vote");
							response = [];
							response.push("**Remaining mappool:**");
							for (var maps in self.lockedServers[msg.guild.id]['mappool_remain']) {
								//console.log(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_remain'][maps]);
								response.push(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_remain'][maps]);
							}
							response.push("Okay, "+self.lockedServers[msg.guild.id]['curr_voter'].toString()+ " it's your turn with: **"+self.lockedServers[msg.guild.id]['bo_mode'][self.lockedServers[msg.guild.id]['turn_number']]+"**");
							msg.channel.sendMessage(response);
						}
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
						if (values[0] > 0 && values[0] <= self.lockedServers[msg.guild.id]['mappool_remain'].length) {
							console.log("Voter: "+msg.author.id+"dropped "+self.lockedServers[msg.guild.id]['mappool'][Number(values[0])]);
							self.lockedServers[msg.guild.id]['mappool_dropped'].push(self.lockedServers[msg.guild.id]['mappool_remain'][Number(values[0]-1)]);
							self.lockedServers[msg.guild.id]['mappool_remain'].splice(Number(values[0])-1,1);
							self.lockedServers[msg.guild.id]['turn_number'] += 1;
							self.lockedServers[msg.guild.id]['curr_voter'] = self.lockedServers[msg.guild.id]['next_voter'];
							self.lockedServers[msg.guild.id]['next_voter'] = msg.author;
							response.join("Thanks for your vote");
						} else {
							response.push("You vote is out of range, try again");
						}

						msg.channel.sendMessage(response.join('\n'));
						if (self.lockedServers[msg.guild.id]['turn_number'] === self.lockedServers[msg.guild.id]['bo_mode'].length) {
							response = [];
							console.log("Reached end of votes");
							self.lockedServers[msg.guild.id]['mappool_voted'].push(self.lockedServers[msg.guild.id]['mappool_remain'][0]);
							self.lockedServers[msg.guild.id]['mappool_remain'].pop();
							response.push('Congratulations, you have finished your mappool');
							response.push("*List of voted maps:*");
							response.push('```');
							response.push(self.lockedServers[msg.guild.id]['mappool_voted'].join(' - '));
							response.push('```');
							response.push("**Have fun and good luck :-)**");
							response.push('*This wizard is now closed and ready for a next vote*');
							msg.channel.sendMessage(response);
							delete self.lockedServers[msg.guild.id];
						} else {
							console.log("Go ahead with next vote");
							response = [];
							response.push("**Remaining mappool:**");
							for (var maps in self.lockedServers[msg.guild.id]['mappool_remain']) {
								//console.log(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_remain'][maps]);
								response.push(String(Number(maps)+1)+": "+self.lockedServers[msg.guild.id]['mappool_remain'][maps]);
							}
							response.push("Okay, "+self.lockedServers[msg.guild.id]['curr_voter'].toString()+ " it's your turn with: **"+self.lockedServers[msg.guild.id]['bo_mode'][self.lockedServers[msg.guild.id]['turn_number']]+"**");
							msg.channel.sendMessage(response);
						}
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
				example : "**Example:** ```\?show mappool | modes```",
				process : function (bot,msg,values) {
					if (msg.channel.type !== 'text') {
						msg.channel.sendMessage("You can't get any result in DM");
					} else {
						self.mongoFindServer(self.url,msg.guild.id,function(response) {
							var responseMsg = [];
							if (values.length === 0) {
								msg.channel.sendMessage("Please say what i should show you\n```\?show mappool | modes```");
							} else if (values[0] === 'mappool') {
								console.log(response[0].games);
								for (var game in response[0].games) {
									console.log(game);
									console.log(response[0].games[game]);
									responseMsg.push('**'+game+':**');
									responseMsg.push('Mappool:');
									responseMsg.push('```');
									responseMsg.push(response[0].games[game].mappool.join('\n'));
									responseMsg.push('```');
								}
							} else if (values[0] === 'modes') {
								console.log(response[0].games);
								for (var game in response[0].games) {
									console.log(game);
									console.log(response[0].games[game]);
									responseMsg.push('**'+game+':**');
									responseMsg.push('*Votable modes:*');
									for (var pickModes in response[0].games[game].pick_modes ) {
										//console.log(pickModes);
										//console.log(response[0].games[game].pick_modes[pickModes]);
										responseMsg.push('**'+pickModes+'**');
										responseMsg.push('```');
										responseMsg.push(response[0].games[game].pick_modes[pickModes].join('-'));
										responseMsg.push('```');
									}
									//responseMsg.push('```'+response[0].games[game].pick-modes.toString()+'```');
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
			},
			"swap": {
				desc: "Swap voting players.",
				example: "**Example:** ?swap",
				process: function(bot,msg,values) {
					var response = [];
					console.log(self.lockedServers);
					//console.log(msg.author);
					//console.log(self.lockedServers[msg.guild.id]);
					if (msg.channel.type !== 'text') {
						response.push("You can't drop a map in DM");
					} else if (!self.lockedServers.hasOwnProperty(msg.guild.id)) {
						response.push("There isn't something you can vote");
					} else if (self.lockedServers[msg.guild.id]['curr_voter'] === msg.author && self.lockedServers[msg.guild.id]['turn_number'] === 0 && self.lockedServers[msg.guild.id]['swapped'] === false) {
						self.lockedServers[msg.guild.id]['swapped'] = true;
						self.lockedServers[msg.guild.id]['curr_voter'] = self.lockedServers[msg.guild.id]['next_voter'];
						self.lockedServers[msg.guild.id]['next_voter'] = msg.author;
						response.push("**Swapped**");
						response.push("Okay, "+self.lockedServers[msg.guild.id]['curr_voter'].toString()+ " you start voting with: **"+self.lockedServers[msg.guild.id]['bo_mode'][self.lockedServers[msg.guild.id]['turn_number']]+"**");
						msg.channel.sendMessage(response);
					}
				}
			}
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
			'swapped': false,
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
