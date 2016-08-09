//
// Mappool-System zur Auswahl von Maps für ein Wettkampf
//

"use strict";
var fs = require("fs");

class MappoolCore {
	constructor(config) {
		this.config = config;
		//this.configFile = process.env.PWD+'/config/'+config;
		console.log("Starting Mappool-Core");
		console.log(this.config);
		//try {
		//	fs.accessSync(this.configFile, fs.F_OK);
		//	this.config = require(this.configFile);
		//} catch (error) {
		//	console.error('Could not find File: '+this.configFile);
		//	process.exit(1);
		//}
	}
	cointoss() {
		return Math.floor(Math.random() * 2);
	}
	getFullData() {
		return this.config;
	}
	getMappoolByKey(gameMode) {
		//console.log(gameMode);
		//console.log(this.config[gameMode]);
		return this.config[gameMode];
	}
	getBestOfModeByKey(boMode) {
		//console.log(boMode);
		//console.log(this.config["pick-mode"][boMode])
		return this.config["pick-mode"][boMode];
	}

}

exports.MappoolCommands = class MappoolCommands extends MappoolCore {
	constructor(config) {
		super(config);
		//this.bot = bot;
		this.message = {};
		this.contentArray = [];
		this.lockedPlayer = '';
		this.isLocked = false;
		this.mappoolTempData = {
			'player_a' : '',
			'player_b' : '',
			'bo_mode' : [],
			'mappool' : []
		};
		this.returnMsg = [];
	}
	//centralized function for incoming messages
	incoming(msg) {
		this.message = msg;
		//console.log(this.message);
		this.contentArray = this.message.content.split(' ');
		//console.log(this.message.content.split(' '));
		switch (this.contentArray[0]) {
			case '?help':
				console.log('Asking for help in mappool-module');
				var helpFile = process.env.PWD+'/docs/help-mappool.md';
				try {
					fs.accessSync(helpFile, fs.F_OK);
					this.returnMsg.push(fs.readFileSync(helpFile, "utf8") );
				} catch (error) {
					console.error('Could not find File: '+helpFile);
				}
				break;
			case '?mappool':
				var fullInfo = super.getFullData();
				this.returnMsg.push('**Current Pool**') ;
				for (var pool in fullInfo) {
					if (pool !== 'pick-mode') {
						//console.log(pool);
						this.returnMsg.push('*'+pool+'*: '+fullInfo[pool].join(', ') );
					}
				}
				break;
			case '?start':
				if (this.isLocked) {
					this.returnMsg.push('A vote is already started. Type **\?abort** to cancel your first inputs' );
					console.log('mappool try to restart by: ' + msg.author.username );
				} else {
					console.log(this.contentArray.length);
					if (this.contentArray.length === 3 ) {
						this.lockedPlayer = msg.author.id;
						this.isLocked = true;
						this.mappoolTempData['player_a'] = msg.author.id;
						this.mappoolTempData['bo_mode'] = super.getBestOfModeByKey(this.contentArray[1]);
						this.mappoolTempData['mappool'] = super.getMappoolByKey(this.contentArray[2]);
						console.log(this.mappoolTempData);
						//Giving player a chance to start the wizard with valid data
						if (this.mappoolTempData['bo_mode'] === undefined || this.mappoolTempData['mappool'] === undefined) {
							this.returnMsg.push('Looks like i did not found something votable. Please try again.');
							this.lockedPlayer = '';
							this.isLocked = false;
							this.mappoolTempData = {
								'player_a' : '',
								'player_b' : '',
								'bo_mode' : [],
								'mappool' : []
							};
							console.log('mappool canceled while undefined data by: ' + msg.author.username );
						} else {
							this.returnMsg.push('Starting the Mappool-Wizard' );
							this.returnMsg.push('We need a second player!');
							this.returnMsg.push('Second-Player can register by typing **\?opponent**' );
							console.log('mappool start by: ' + msg.author.username );
						}
					} else {
						this.returnMsg.push( 'Looks like you have forgotten some additional parameters' );
						this.returnMsg.push( '**Example:** ```\?start bo3 ift```' );
					}
				}
				break;
			case '?abort':
				if (msg.author.id === this.lockedPlayer && this.isLocked) {
					this.returnMsg.push( 'Aborting the Mappool-Wizard. You can restart it by typing **\?start** ' );
					//Deleting user who locked the wizard
					this.lockedPlayer = '';
					this.isLocked = false;
					this.mappoolTempData = {
						'player_a' : '',
						'player_b' : '',
						'bo_mode' : [],
						'mappool' : []
					};
					console.log('mappool abort by: ' + msg.author.username );
				} else if (this.isLocked) {
					this.returnMsg.push( 'Aborting the vote is only possible by the player who started this process' );
				} else {
					console.log('mappool try to abort before starting it: ' + msg.author.username );
				}
				break;
			case '?done':
				if (msg.author.id === this.lockedPlayer && this.isLocked) {
					this.returnMsg.push( 'Looks like we are done here. Have fun and good luck' );
					//Deleting user who locked the wizard
					this.lockedPlayer = '';
					this.isLocked = false;
					this.mappoolTempData = {
						'player_a' : '',
						'player_b' : '',
						'bo_mode' : [],
						'mappool' : []
					};
					console.log('mappool done by: ' + msg.author.username );
				} else if (this.isLocked) {
					this.returnMsg.push( 'Closing the vote is only possible by the player who started this process' );
				} else {
					console.log('mappool try to save data without starting it: ' + msg.author.username );
				}
				break;
			case '?opponent':
				console.log(this.mappoolTempData);
				if (this.isLocked) {
					if (msg.author.id === this.mappoolTempData['player_a']) {
						this.returnMsg.push( 'You cannot be both players' );
						console.log('mappool player_a has tried to be player_b: ' + msg.author.username );
					} else {
						this.mappoolTempData['player_b'] = msg.author.id;
						this.returnMsg.push( 'Okay. We have two players in here. Let me make a cointoss' );
						if (super.cointoss() === 0) {
							this.returnMsg.push('Winner is Player A');
						} else {
							this.returnMsg.push('Winner is Player B');
						}

						console.log('mappool found player_b: ' + msg.author.username );
					}
				}
				break;
			case '?pick':
				console.log(super.cointoss());
				break;
			case '?drop':
				break;
			default:
				break;

		}
		this.response(this.returnMsg.join('\n'));
		return;
	}

	//Starting the Wizard
	start() {
		const mapPool = super.getMappoolByKey("ift-mappool");
		const boMode = super.getBestOfModeByKey("bo3");
		console.log(mapPool);
		//console.log(boMode);
		for (var choose in boMode) {
			console.log(boMode[choose]);
		}

	}
	getUserCommands() {
		var that = this;
		var commands = {
			"start": {
				desc : "Starting Mappool-Wizard",
				process : function(bot,msg,values) {
					console.log(values);
					var response = [];
					if (that.isLocked) {
						console.log(that);
						response.push("Mappool-Wizard already started");
					} else if (!that.isLocked && values.length === 2) {
						console.log(that);
						that.isLocked = true;
						that.lockedPlayer = msg.author.id;
						response.push("Successfully started Mappool-Wizard");
						response.push("First, we need a second player.");
						response.push("He can register himself with **\?opponent**");
					}else {
						response.push("Looks like you have fotgot something");
						response.push("**Example:** ```\?start bo3 ift```");
					}
					bot.sendMessage(msg.channel,response.join('\n'));
				}
			},
			"opponent" : {
				desc : "Register as second player to voting",
				process : function(bot,msg,values) {
					var response = [];
					if (that.isLocked && that.lockedPlayer === msg.author.id) {
						response.push("You can't be both players");
					} else if (that.isLocked && that.lockedPlayer !== msg.author.id) {
						response.push("Okay. We have two players in here. Let me make a cointoss");
					}
					bot.sendMessage(msg.channel,response.join('\n'));
				}
			},
			"abort" : {
				desc : "Abort voting",
				process: function(bot,msg,values) {
					var response = [];
					if (that.isLocked && that.lockedPlayer === msg.author.id) {
						that.isLocked = false;
						that.lockedPlayer = "";
						response.push("Aborted Mappool-Wizard");
					} else if (that.isLocked && that.lockedPlayer !== msg.author.id) {
						response.push("You are not allowed to cancel the Mappool-Wizard");
					}
					bot.sendMessage(msg.channel,response.join('\n'));
				}
			},
			"done" : {
				desc : "Close voting"},
			"mappool" : {
				desc : "List current mappool"},
			"pick" : {
				desc : "Pick a map (if it's your turn)"},
			"drop" : {
				desc : "Drop a map (if it's your turn)"},
			"voted" : {
				desc : "Show voted / dropped maps"}
		}
		return commands;
	}
	getAdminCommands() {
		var that = this;
		var commands = {
			"addGame" : {
				desc : "Add a new game to Wizard"},
			"delGame" : {
				desc : "Delete a game from Wizard"},
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
}
