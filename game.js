//Cards: from 2-14, where 11: Jack, 12: Queen, 13: King, 14: Ace
//Symbols: hearts, dimonds, clubs, spades -> h, d, c, s
//Therefore 14S is the Ace of Spades, 11H is the Jack of Hearts, 7C is the Seven of Clubs
var Utils = require("./utils.js");
var utils = new Utils();

function Game() {
	this.pack = this._shufflePack(this._createPack());
}

//sets up two times 52 cards as a pack
Game.prototype._createPack = function() {
	var suits = ["H", "C", "S", "D"];
	var pack = [];
	var n = 52;
	var index = n / suits.length;
	var packCount= 0;
	for(i = 0; i <= 3; i++)
	for(j = 2; j <= index+1; j++) {
		pack[packCount++] = j + suits[i];
	}
	return pack;
}

//shuffles the pack - based on the Fisher-Yates algorithm
Game.prototype._shufflePack = function(pack) {
	var i = pack.length, j, tempi, tempj;
	if (i === 0) return false;
	while (--i) {
		j = Math.floor(Math.random() * (i + 1));
		tempi = pack[i]; tempj = pack[j]; pack[i] = tempj; pack[j] = tempi;
	}
	return pack;
}

//sort pack of cards
Game.prototype.sortCards = function (cards) {
	var hearts = [], clubs = [], diamonds = [], spades = [];
	for (var i = 0; i < cards.length; i++) {
		if (cards[i][cards[i].length-1] == 'H')
			hearts.push(cards[i].substr(0,cards[i].length));
		else if (cards[i][cards[i].length-1] == 'C')
			clubs.push(cards[i].substr(0,cards[i].length));
		else if (cards[i][cards[i].length-1] == 'D')
			diamonds.push(cards[i].substr(0,cards[i].length));
		else if (cards[i][cards[i].length-1] == 'S')
			spades.push(cards[i].substr(0,cards[i].length));
	}
	var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
	hearts.sort(collator.compare);
	clubs.sort(collator.compare);
	diamonds.sort(collator.compare);
	spades.sort(collator.compare);
	cards = [];
	for (var i = 0; i < hearts.length; i++)
		cards.push(hearts[i]);
	for (var i = 0; i < clubs.length; i++)
		cards.push(clubs[i]);
	for (var i = 0; i < diamonds.length; i++)
		cards.push(diamonds[i]);
	for (var i = 0; i < spades.length; i++)
		cards.push(spades[i]);
	return cards;
}

//draw one card from the pack of cards, initial T|F appends cards in hand
Game.prototype.drawCard = function(pack, amount, hand, initial) {
	var cards = [];
	cards = pack.slice(0, amount);
	pack.splice(0, amount);
	if (!initial) {
		hand.push.apply(hand, cards);
	}
	return cards;
}

//plays a card with specific index, from specific hand, and places the card on the table
Game.prototype.playCard = function(index, hand, table) {
	var playedCard = hand.splice(index, 1); //we can only play one card at a time at the moment
	table.push.apply(table, playedCard);
}

//at the start of the game, we put one card to the table from the pack (top card of the deck)
Game.prototype.playFirstCardToTable = function(pack) {
	return  pack.splice(0,1);
}

Game.prototype.cardsOnTable = function(table, card) {
	if (card) {
		return table.concat(card);
	} else {
		return table;
	}
}

//returns the last card on the table
Game.prototype.lastCardOnTable = function(table) {
	return utils.last(table);
}

Game.prototype.isCardPlayable = function(card, lastCardOnTable, hand) {
	if (card) {
		var cardSuite = card[card.length-1];
		if (lastCardOnTable === undefined)
			return true;
		var lastCardSuite = lastCardOnTable[lastCardOnTable.length-1];
		if (cardSuite === lastCardSuite) {
			return true;
		} else {
			for (var i = 0; i < hand.length; i++)
				if (hand[i][hand[i].length-1] == lastCardSuite)
					return false;
			return true;
		}
	}
}

Game.prototype.isWinning = function(hand) {
	if (hand.length == 0) {
		return true;
	} else { return false; }
}

Game.prototype.isGameOver = function(players) {
	var flag = -1, count = 0;
	for (var i = 0; i < players.length; i++) {
		if (players[i].hand.length != 0) {
			flag = i;
			count++;
		}
	}
	if (count == 1)
		return flag;
	return -1;
}

module.exports = Game;