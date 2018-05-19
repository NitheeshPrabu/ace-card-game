Game = require("./game.js");
Table = require('./table.js');
var uuid = require('node-uuid');

function Messaging() {};

Messaging.prototype.sendEventToAllPlayers = function(event, message, io, players) {
	for(var i = 0; i < players.length; i++){
		io.to(players[i].id).emit(event, message);
	}
};

Messaging.prototype.sendEventToAllUnJoinedPlayers = function(event, message, io, players) {
	for(var i = 0; i < players.length; i++){
		if (players[i].status != 'intable')
			io.to(players[i].id).emit(event, message);
	}
};

Messaging.prototype.sendEventToAllPlayersButPlayer = function(event,message,io,players,player) {
	for(var i = 0; i < players.length; i++) {
		if(players[i].id != player.id) {
			io.to(players[i].id).emit(event, message);
		}
	}	
};

Messaging.prototype.sendEventToAPlayer = function(event,message,io,players,player) {
	for(var i = 0; i < players.length; i++) {
		if(players[i].id == player.id) {
			io.to(players[i].id).emit(event, message);
		}
	}	
};

Messaging.prototype.createTable = function(tableId,playerLimit) {
	var game = new Game();
	//var table = new Table(uuid.v4());
	var table = new Table(tableId,playerLimit);
	table.setName("Table " + tableId);
	table.gameObj = game;
	table.pack = game.pack; //adds the shuffled pack from the constructor
	table.status = "available";
	console.log(table.name + " was created.");
	return table;
};

Messaging.prototype.createRoom = function(amount) {}

module.exports = Messaging;