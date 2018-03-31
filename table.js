Game = require('./game.js');


Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

function Table(tableID){
	this.id = tableID;
	this.name = "";
	this.status = "available";
	this.players = [];
	this.playersID = [];
	this.readyToPlayCounter = 0;
	this.playerLimit = 3;
	this.pack = [];
	this.cardsOnTable = [];

	this.roundStartedBy;

	this.gameObj = null;
};

Table.prototype.progressRound = function(player) {
	var id;
	for(var i = 0; i < this.players.length; i++) {
		this.players[i].turnFinished = true;
		if (player.id == this.players[i].id)
			id = (i+1)%this.players.length;
	}
	if (this.players[id].id == this.roundStartedBy) {
		var maxCard = 0, maxID = 0;
		for (var i = 0; i < this.cardsOnTable.length; i++) {
			var curCardFace = parseInt(this.cardsOnTable[i].substring(0,this.cardsOnTable[i].length-1));
			if (curCardFace > maxCard) {
				maxID = i;
				maxCard = curCardFace;
			}
		}
		id = (id+maxID)%this.players.length;
		this.players[id].turnFinished = false;
		return id;
	}
	this.players[id].turnFinished = false; 
	return -1;
}

Table.prototype.setName = function(name){
	this.name = name;
};

Table.prototype.getName = function(){
	return this.name;
};

Table.prototype.setStatus = function(status){
	this.status = status;
};

Table.prototype.isAvailable = function(){
	return this.status === "available";
};

Table.prototype.isFull = function(){
	return this.status === "full";
};

Table.prototype.isPlaying = function(){
	return this.status === "playing";
};

Table.prototype.addPlayer = function(player) {
	if (this.status === "available") {
		var found = false;
		for(var i = 0; i < this.players.length; i++) {
			if(this.players[i].id == player.id){
				found = true;
				break;
			}
		}
		if(!found){
			this.players.push(player);
			if(this.players.length == this.playerLimit){
				//this.status = "playing";
				for(var i = 0; i < this.players.length; i++){
					this.players[i].status = "intable";
				}
			}
			return true;
		}
	}
	return false;
};

Table.prototype.removePlayer = function(player){
	var index = -1;
	for(var  i = 0; i < this.players.length; i++){
		if(this.players[i].id === player.id){
			index = i;
			break;
		}
	}
	if(index != -1){
		this.players.remove(index);
	}
};

Table.prototype.isTableAvailable = function() {
	if( (this.playerLimit >= this.players.length) && (this.status === "available")) {
		return true;
	} else {
		return false;
	}
	//return (this.playerLimit > this.players.length);
};

Table.prototype.createMessageObject = function() {
	var table = this;
	var TableMessage = function(){
		this.id = table.id;
		this.name = table.name;
		this.status = table.status;
		this.players = table.players;
		this.playerLimit = table.playerLimit;
	};

	return new TableMessage();
};

module.exports = Table;