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
// Starting Instances from modules
var core = new Core.Commands(config);
var mp = new Mappool.MappoolCommands(config);

//////////////////////////////////////
// Starting the bot
const Discord = require('discord.js');
var mybot = new Discord.Client();

mybot.loginWithToken(config.discord_token);

mybot.on('ready', function () {
	var statusMessage = [];
	var serverArray = [];
	console.log('Ready to begin! Serving on ' + mybot.servers.length + ' servers');
	statusMessage.push('Bot was started');
	statusMessage.push('Command-Prefix: '+config.discord_prefix);
	statusMessage.push('Working on '+mybot.servers.length+' servers');
	for (var server in mybot.servers) {
		if (typeof(mybot.servers[server]) === 'object' ) {
			//console.log("Name:  "+mybot.servers[server].name);
			//console.log("ID:    "+mybot.servers[server].id);
			//console.log("Owner: "+mybot.servers[server].owner.username+'#'+mybot.servers[server].owner.discriminator);
			//console.log(mybot.servers[server].owner.id);
			statusMessage.push("**Name:  **"+mybot.servers[server].name);
			statusMessage.push("Owner: "+mybot.servers[server].owner.username+'#'+mybot.servers[server].owner.discriminator);
			serverArray.push({
				'server_id': mybot.servers[server].id,
				'server_name': mybot.servers[server].name,
				'owner_id': mybot.servers[server].owner.id,
				'admins': [mybot.servers[server].owner.id]});
		}
	}
	mybot.setStatus('available','type ?help');
	mybot.sendMessage(config.discord_botOwner,statusMessage.join('\n'));
	//core.mongoUpdateServer(serverArray);
	//core.mongoFindServer("115554690686648327");
});

//var adminCommands = core.getAdminCommands();
//var userCommands = core.getUserCommands();
//console.log(adminCommands);
//console.log(userCommands);

var adminCommands = getAdminCommands();
var userCommands = getUserCommands();

console.log(adminCommands);
console.log(userCommands);


//////////////////////////////////////
// New Message
mybot.on('message', function(msg) {
	//if (msg.content.indexOf('?help') === 0) {
	
	//if (msg.author.id !== mybot.user.id && msg.content[0] === config.discord_prefix && msg.author.id === config.discord_botOwner) {
	if (msg.author.id !== mybot.user.id && msg.content[0] === config.discord_prefix) {
		var command = msg.content.split(" ")[0].substring(1);
		var values = msg.content.split(" ").slice(1);
		//mybot.sendMessage(config.discord_botOwner, command);
		//mybot.sendMessage(config.discord_botOwner, values.join("\n"));
		if (command === "admin") {
			console.log("Emitted admin-command");
			var adminCmd = values[0];
			var adminValues = values.slice(1);
			if (adminCmd !== undefined ) {
				console.log(adminCmd);
				console.log(adminValues);
				if (adminCommands.hasOwnProperty(adminCmd)) {
					console.log("Found a valid admin-command");
					adminCommands[adminCmd].process(mybot,msg,adminValues);
				} else if (adminCmd === "help") {
					var response = [];
					for (var cmd in adminCommands) {
						response.push('**'+config.discord_prefix+cmd+'**: '+adminCommands[cmd].desc)
					}
					mybot.sendMessage(msg.channel, response.join("\n"));
					console.log("admin-help abfrage by: "+msg.author.username);
				}
			}
		} else if (userCommands.hasOwnProperty(command)) {
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
			mybot.sendMessage(msg.channel, response.join("\n"));
			console.log("help abfrage by: "+msg.author.username);
		}
	}

	//if (msg.channel.isPrivate) {
	//	//console.log(msg);
	//	core.mongoFindServer("115554690686648327",callback);
	//}
});

//////////////////////////////////////
// Welcome-Message for new invitations
mybot.on('serverCreated', function(server) {
	var message = [
		'Thanks for inviting HAL to your Server',
		'This Bot is still under construction',
		'Be patient for upcoming features',
		'For more informations please visit',
		'https://github.com/cvantum/dgb'];
	//server.client.sendMessage(message.join('\n'));
	console.log('New Server joined: '+server.name);
	console.log('Server owner: '+server.owner.username+'#'+server.owner.discriminator);
	mybot.sendMessage(config.discord_botOwner,'New Server joined: '+server.name+'\n'+'Server owner: '+server.owner.username+'#'+server.owner.discriminator);
});

//////////////////////////////////////
// Get List of Commands for loaded modules
function getAdminCommands() {
	var commands = {};
	var coreCommands = core.getAdminCommands();
	for (var coreCmd in coreCommands) {
		commands[coreCmd] = coreCommands[coreCmd];
	}
	var mpCommands = mp.getAdminCommands();
	for (var mpCmd in mpCommands) {
		commands[mpCmd] = mpCommands[mpCmd];
	}
	return commands;
}

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
