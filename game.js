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
//not yet tested but - it should return all the cards on the table - so we can reshuffle it and use it as a new pack
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

module.exports = Game;