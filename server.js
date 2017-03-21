// Discord Gaming Bot (DGB)
//
// Mapping several APIs into Bot-Commands
//
//

"use strict";

//////////////////////////////////////
// Require-Statements for own modules

const Core = require(process.env.PWD+'/modules/core.js');
const Mappool = require(process.env.PWD+'/modules/mappool.js');



//////////////////////////////////////
// Check for valid config-file
var fs = require("fs");

var configFile = process.env.PWD+'/config/config.json';
try {
	fs.accessSync(configFile, fs.F_OK);
	var config = require(configFile);
} catch (error) {
	console.error('Could not find File: '+configFile);
	process.exit(1);
}

//////////////////////////////////////
// Starting instances from every module
var core = new Core.Commands(config);
var mp = new Mappool.MappoolCommands(config);

//////////////////////////////////////
// Starting the bot
const Discord = require('discord.js');
var mybot = new Discord.Client();

mybot.login(config.discord_token);


//////////////////////////////////////
// Emitted event on 'ready'
mybot.on('ready', () => {
	var statusMessage = [];
	var serverArray = [];
	console.log('Ready to begin! Serving on ' + mybot.guilds.size + ' servers');
	statusMessage.push('Bot was started');
	statusMessage.push('Command-Prefix: '+config.discord_prefix);
	statusMessage.push('Working on '+mybot.guilds.size+' servers');
	for (var server in mybot.guilds.array() ) {
		statusMessage.push("**Name:  **"+mybot.guilds.array()[server].name);
		statusMessage.push("Owner: "+mybot.guilds.array()[server].owner.user.username+'#'+mybot.guilds.array()[server].owner.user.discriminator);
		serverArray.push({
			'server_id': mybot.guilds.array()[server].id,
			'server_name': mybot.guilds.array()[server].name,
			'owner_id': mybot.guilds.array()[server].ownerID,
			'admins': [mybot.guilds.array()[server].ownerID]});
	}
	mybot.user.setStatus('online','type ?help');
	console.log(statusMessage);
	//console.log(config.discord_botOwner);
	//console.log(mybot.users.get(config.discord_botOwner));
	mybot.users.get(config.discord_botOwner).sendMessage(statusMessage.join('\n'));
	//core.mongoUpdateServer(serverArray);
	//core.mongoFindServer("115554690686648327");
});

//var adminCommands = core.getAdminCommands();
//var userCommands = core.getUserCommands();
//console.log(adminCommands);
//console.log(userCommands);

var userCommands = getUserCommands();
console.log(userCommands);


//////////////////////////////////////
// Emitted event on 'message'
mybot.on('message', (msg) => {
	if (!msg.author.bot && msg.content.startsWith(config.discord_prefix)) {
		var command = msg.content.split(" ")[0].substring(1);
		var values = msg.content.split(" ").slice(1);

		if (userCommands.hasOwnProperty(command)) {
			console.log("Emitted user-command");
			userCommands[command].process(mybot,msg,values);

		} else if ( command === "help") {
			var response = [];
			if (values.length === 0) {
				for (var cmd in userCommands) {
					response.push('**'+config.discord_prefix+cmd+'**: '+userCommands[cmd].desc)
				}
			} else if (userCommands.hasOwnProperty(values[0])) {
				console.log(userCommands[values[0]].example);
				response.push(userCommands[values[0]].example);
			}
			msg.channel.sendMessage(response.join("\n"));
			console.log("help abfrage by: "+msg.author.username);
		}
	}

	//if (msg.channel.isPrivate) {
	//	//console.log(msg);
	//	core.mongoFindServer("115554690686648327",callback);
	//}
});

//////////////////////////////////////
// Get List of User-Commands for loaded modules
function getUserCommands() {
	var commands = {};
	var coreCommands = core.getUserCommands();
	for (var coreCmd in coreCommands) {
		commands[coreCmd] = coreCommands[coreCmd];
	}
	var mpCommands = mp.getUserCommands();
	for (var mpCmd in mpCommands) {
		commands[mpCmd] = mpCommands[mpCmd];
	}
	return commands;
}
