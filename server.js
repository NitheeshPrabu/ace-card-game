var socket = require('socket.io');
var Game = require('./game.js');
var Player = require("./player.js");
var Messaging = require('./messaging.js');
var Table = require('./table.js');
var Room = require('./room.js');
var Utils = require('./utils.js');
utils = new Utils();
var firstRound = 1;

//setup an Express server to serve the content
var http = require("http");
var express = require("express");
var app = express();

app.use("/", express.static(__dirname + "/"));
app.use("/resources", express.static(__dirname + "/resources"));
var server = http.createServer(app);
var port = Number(process.env.PORT || 3000);
server.listen(port);
var io = socket.listen(server);

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});
io.set("log level", 1);

//creating the messaging object & testroom with sample table
var messaging = new Messaging();
var room = new Room("Test Room");
room.tables = messaging.createSampleTables(1);

//starting the socket and awaiting connections
io.sockets.on('connection', function (socket) {

	/*
	When a player connects to the server,  we immediately create the player object.
	- the Player's name comes from frontend.
	- the player ID is the socket.ID
	- every player by default will be added to a room ("lounge")
	Message is shown in the logging board
	*/
	socket.on('connectToServer',function(data) {
		var player = new Player(socket.id);
		var name = data.name; //get the player's name
		player.setName(name);
		room.addPlayer(player); //add to room -- all players go to a room first
		io.sockets.emit("logging", {message: name + " has connected."});
	});

	/* 
	When someone connects to a table we need to do a few things:
	These include:
	- check if there's space at the table where they want to connect
	- assign the player to a table (if available)
	- change the player's status from 'available' to 'in table'
	- save the player's name, and ID (socket client ID) in the appropriate arrays at the table.

	If a table has 2 players, we need to do more:
	- set the table's status from 'available' to 'unavailable'
	- create a pack (instantiate the game object)
	- send a time counter of 3 seconds to both connected clients
	- after the 3 second delay, emit a 'PLAY' message
	*/

	socket.on('connectToTable',function(data) {
		var player = room.getPlayer(socket.id);
		var table = room.getTable(data.tableID);
		if (table.addPlayer(player) && table.isTableAvailable()) {
			player.tableID = table.id;
			player.status = "intable";
			table.playersID.push(socket.id); //probably not needed
			io.sockets.emit("logging", {message: player.name + " has connected to table: " + table.name + "."});
			if (table.players.length < table.playerLimit) {
				io.sockets.emit("logging", {message: "There is " + table.players.length + " player at this table. The table requires atleast " + table.playerLimit + " players to begin." });
				io.sockets.emit("waiting", {message: "Waiting for other player to join."});
			} else {
				io.sockets.emit("logging", {message: "There are " + table.players.length + " players at this table. Play will commence when all players click the Start Game button." });
			}
		} else {
			console.log("for whatever reason player can't be added to table."); //needs looking at
		}
	});


	/*
	Once the counter has finished both clients will emit a "readyToPlay" message
	Upon the receival of this message, we check against a local variable (never trust data from the client) and
	we setup the play environment:
	- change the table's state to "unavailable"
	- change the player's status to "playing"
	- assign 5 cards to each player
	- flip the first card
	- we are going to check if this card is an action card
	- if it is, we will call the appropriate action
	- otherwise we are going to assign the start priviledge to a random player at the table
	*/

	socket.on("readyToPlay", function(data) {
		console.log("Ready to play called");
		var player = room.getPlayer(socket.id);
		var table = room.getTable(data.tableID);
		player.status = "playing";
		table.readyToPlayCounter++;
		if (table.readyToPlayCounter === table.playerLimit) {
			table.status = "unavailable"; //set the table status to unavailable
			var startingPlayerID;
			for (var i = 0; i < table.players.length; i++) { //go through the players array (contains all players sitting at a table)
				table.players[i].hand = table.gameObj.drawCard(table.pack, 52/table.players.length, "", 1); //assign initial 5 cards to players
				if (table.players[i].hand.indexOf("14S") != -1) {
				  startingPlayerID = table.playersID[i]; //get the ID of the player with Aces of Spade.
				  table.roundStartedBy = startingPlayerID;
				}
			}
			for (var i = 0; i < 52%table.players.length; i++)
				table.players[i].hand.push(table.gameObj.drawCard(table.pack,1,table.players[i].hand,1)[0]);
			for (var i = 0; i < table.players.length; i++) {
				if (table.players[i].id === startingPlayerID) { //this player will start the turn
					table.players[i].turnFinished = false;
					console.log(table.players[i].name + " starts the game.");
					messaging.sendEventToAllPlayersButPlayer("logging", {message: table.players[i].name + " has the Ace of Spades. They will begin the game."},io,table.players,table.players[i]);
					messaging.sendEventToAPlayer("logging", {message: "You have the Ace of Spades. You may begin the game with any card of your choice."},io,table.players,table.players[i]);
					io.to(table.players[i].id).emit("play", { hand: table.players[i].hand }); //send the cards in hands to player
					io.to(table.players[i].id).emit("turn", { myturn: true }); //send the turn-signal to player
					io.to(table.players[i].id).emit("ready", { ready: true }); //send the 'ready' signal
				} else {
					table.players[i].turnFinished = true;
					console.log(table.players[i].name + " will not start the game.");
				  	io.to(table.players[i].id).emit("play", { hand: table.players[i].hand }); //send the card in hands to player
				  	io.to(table.players[i].id).emit("turn", { myturn: false }); //send the turn-signal to player
				  	io.to(table.players[i].id).emit("ready", { ready: true }); //send the 'ready' signal
				}
				messaging.sendEventToAPlayer('cardInHandCount', {players: table.players}, io, table.players, table.players[i]);
			}
			//sends the cards to the table.
			messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: table.cardsOnTable}, io, table.players);
			io.sockets.emit('updatePackCount', {packCount: table.pack.length});
		}
	});


	/* 
	A player can decide to the penalty as a result of a penalising card (2*), if he does
	then we need to reset the right variables and also end this player's turn.
	*/

	socket.on("disconnect", function() {
		var player = room.getPlayer(socket.id);
		if (player && player.status === "intable") { //make sure that player either exists or if player was in table (we don't want to remove players)
			//Remove from table
			var table = room.getTable(player.tableID);
			table.removePlayer(player);
			table.status = "available";
			player.status = "available";
			io.sockets.emit("logging", {message: player.name + " has left the table."});
		} 
	});

	socket.on("playCard", function(data) {
		/*
		server needs to check:
		- if it's the player's turn
		- if the played card is in the owner's hand
		- if the played card's index, matches the server side index value
		- if the played card is valid to play
		*/
		var errorFlag = false;
		var player = room.getPlayer(socket.id);
		var table = room.getTable(data.tableID);
		var last = undefined;
		if (table.cardsOnTable)
		last = table.gameObj.lastCardOnTable(table.cardsOnTable); //last card on Table
		if (!player.turnFinished) {
			var playedCard = data.playedCard;
			var index = data.index; //from client
			var serverIndex = utils.indexOf(player.hand, data.playedCard);

			console.log("index => " + index + " | serverindex ==> " + serverIndex);

			if (index == serverIndex) {
				errorFlag = false;
			} else {
				errorFlag = true;
				playedCard = null;
				messaging.sendEventToAPlayer("logging", {message: "Index mismatch - you have altered with the code."}, io, table.players, player);
				socket.emit("play", {hand: player.hand});
			}

			if (utils.indexOf(player.hand, data.playedCard) > -1) {
				errorFlag = false;
			  playedCard = data.playedCard; //overwrite playedCard
			} else {
				errorFlag = true;
				playedCard = null;
				messaging.sendEventToAPlayer("logging", {message: "The card is not in your hand."}, io, table.players, player);
				socket.emit("play", {hand: player.hand});
			}
			if (!errorFlag) {
				if (!table.gameObj.isCardPlayable(playedCard,last,player.hand)) {
					messaging.sendEventToAPlayer("logging", {message: "The selected card cannot be played - please read the rules."}, io, table.players, player); 
				} else {
					console.log("Card is playable.");
					table.gameObj.playCard(index, player.hand, table.cardsOnTable);
					messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard}, io, table.players);
					io.sockets.emit("logging", {message: player.name + " plays a card: " + playedCard});
					setTimeout(function() {	//round over - either tochoo or all players have played. so must discard pile.
						if (last != undefined && data.playedCard[playedCard.length-1] != last[last.length-1]) { //tochoo card, force the player with max face value to pick up discard pile
						  	var maxCard = 0, maxID = 0;
						  	for (var i = 0; i < table.cardsOnTable.length-1; i++) {
						  		var curCardFace = parseInt(table.cardsOnTable[i].substring(0,table.cardsOnTable[i].length-1));
						  		if (curCardFace > maxCard) {
						  			maxID = i;
						  			maxCard = curCardFace;
						  		}
						  	}
						  	var offset;
						  	for (var i = 0; i < table.players.length; i++) {
						  		if (table.players[i].id == table.roundStartedBy)
						  			offset = i;
						  	}
						  	maxID = (maxID+offset)%table.players.length;
						  	console.log("Tochoo card played. Forcing " + table.players[maxID].name + " to pick the discard pile.");
						  	messaging.sendEventToAllPlayers("logging", {message: "Tochoo card played. Forcing " + table.players[maxID].name + " to pick the discard pile."},io,table.players);
						  	var cards = table.gameObj.drawCard(table.cardsOnTable, table.cardsOnTable.length, table.players[maxID].hand, 0);
						  	messaging.sendEventToAPlayer("play", {hand: table.players[maxID].hand},io,table.players,table.players[maxID]);
						  	messaging.sendEventToAPlayer("logging", {message: "You took all cards from the discard pile."}, io, table.players, table.players[maxID]);
							for (var i = 0; i < table.players.length; i++) { // person who took cards from discard pile must start next.
								if (table.players[maxID].id == table.players[i].id) {
									table.players[maxID].turnFinished = false;
								} else {
									table.players[i].turnFinished = true;
								}
								setTimeout(function() {
									messaging.sendEventToAllPlayers('clearLog', {}, io, table.players);
								},2000);
							}
						} else {
							var chk = table.progressRound(player);
							if (chk != -1) { // round over. player playing the highest card starts.
								console.log("Round finished. " + table.players[chk].name + " begins next round.");
								messaging.sendEventToAllPlayers("logging", {message: "Round finished. " + table.players[chk].name + " begins next round."},io,table.players);
								table.cardsOnTable = [];
								table.roundStartedBy = table.players[chk].id;
								setTimeout(function() {
									messaging.sendEventToAllPlayers('clearLog', {}, io, table.players);
								},2000);
							}
						}
						for (var i = 0; i < table.players.length; i++) { //emit turn values and updated cards in hand count
							messaging.sendEventToAPlayer("turn", {myturn: !table.players[i].turnFinished}, io, table.players, table.players[i]);
							messaging.sendEventToAPlayer("cardInHandCount", {players: table.players}, io, table.players, table.players[i]);
						}
						messaging.sendEventToAllPlayers("updateCardsOnTable", {cardsOnTable: table.cardsOnTable},io,table.players);
					},1000);
					var winner = table.gameObj.isWinning(player.hand);
					if (!winner) {
						socket.emit("play", {hand: player.hand});
					} else {
						//game is finished
						socket.emit("play", {hand: player.hand});
						messaging.sendEventToAPlayer("turn", {won: "yes"}, io, table.players, player);
						messaging.sendEventToAllPlayersButPlayer("turn", {won: "no"}, io, table.players, player);
						socket.emit("gameover", {gameover: true});
						io.sockets.emit("logging", {message: player.name + " is the WINNER!"});
					}
				}
			} else {
				io.sockets.emit("logging", {message: "Error flag is TRUE, something went wrong"});
			}
		} else { //end of turn
		  	messaging.sendEventToAPlayer("logging", {message: "It's your opponent's turn."}, io, table.players, player);
		}
		messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable}, io, table.players);
	});

});//end of socket.on