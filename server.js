// Discord Gaming Bot (DGB)
//
// Mapping several APIs into Bot-Commands
//
//

"use strict";

//////////////////////////////////////
// Require-Statements for own modules

const Core = require(process.env.PWD+'/modules/core.js');



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

var core = new Core.Commands(config);

//////////////////////////////////////
// Starting the bot
const Discord = require('discord.js');
var mybot = new Discord.Client();

mybot.loginWithToken(config.discord_token);

mybot.on('ready', function () {
	var statusMessage = [];
	console.log('Ready to begin! Serving on ' + mybot.servers.length + ' servers');
	statusMessage.push('Bot was started');
	statusMessage.push('Working on '+mybot.servers.length+' servers');
	for (var server in mybot.servers) {
		if (typeof(mybot.servers[server]) === 'object' ) {
			//console.log("Name:  "+mybot.servers[server].name);
			//console.log("ID:    "+mybot.servers[server].id);
			//console.log("Owner: "+mybot.servers[server].owner.username+'#'+mybot.servers[server].owner.discriminator);
			//console.log(mybot.servers[server].owner.id);
			statusMessage.push("**Name:  **"+mybot.servers[server].name);
			statusMessage.push("Owner: "+mybot.servers[server].owner.username+'#'+mybot.servers[server].owner.discriminator);
		}
	}
	mybot.setStatus('available','type ?help');
	mybot.sendMessage(config.discord_botOwner,statusMessage.join('\n'));
});

//////////////////////////////////////
// New Message


//////////////////////////////////////
// Welcome-Message for new invitations
mybot.on('serverCreated', function(server) {
	var message = [
		'Thanks for inviting HAL to your Server',
		'This Bot is still under construction',
		'Be patient for upcoming features',
		'For more informations please visit',
		'https://github.com/cvantum/dgb'];
	server.client.sendMessage(message.join('\n'));
	console.log('New Server joined: '+server.name);
	console.log('Server owner: '+server.owner.username+'#'+server.owner.discriminator);
	mybot.sendMessage(config.discord_botOwner,'New Server joined: '+server.name+'\n'+'Server owner: '+server.owner.username+'#'+server.owner.discriminator);
});
