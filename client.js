// var socket = io.connect("https://ace-card-game.herokuapp.com"); //production

var socket = io.connect("127.0.0.1:3000");  //local

var playerTableID = undefined;
var gameDone = false;

window.onbeforeunload = socket.emit("disconnect");

socket.on("logging", function(data) {
	if (data.tableID == -1 || data.tableID == playerTableID)
		$("#updates").append("<li>"+ data.message + "</li>"); 
	var log = document.getElementById('footer');
	log.scrollTop = log.scrollHeight;
});

socket.on("chatBoxGlobalMessage", function(data) {
	$("#chat").append("<li><strong><span style='color:red'>" + data.playerName + ":</span></strong> " + data.message + "</li>"); 
	var log = document.getElementById('chatbox');
	log.scrollTop = log.scrollHeight;
});

socket.on("chatBoxTableMessage", function(data) {
	if (data.tableID == playerTableID) {
		$("#chat").append("<li><strong>" + data.playerName + ":</strong> " + data.message + "</li>"); 
		var log = document.getElementById('chatbox');
		log.scrollTop = log.scrollHeight;
	}
});

function playCard(key, value) {
	index = key;
	playedCard = value;
	socket.emit("playCard", {tableID:playerTableID, playedCard: playedCard, index: index});
}

socket.on("clearLog", function(data) {
	if (data.tableID == playerTableID) 
		$("#updates").text("");
});

socket.on("showTables", function(data) {
	if (!playerTableID) {
		$("#listOfTables").text("");
		if (data.tables != null) {
			for (var i = 0; i < data.tables.length; i++) {
				var text = "player";
				if (data.tables[i].status != "unavailable") {
					if (data.tables[i].playerLimit > 1) text += "s";
					$("#listOfTables").append(data.tables[i].name + ": " + data.tables[i].playerLimit + " " + text + ", Status: " + data.tables[i].status);
					if (data.tables[i].playerLimit != data.tables[i].players.length)
						$("#listOfTables").append("&nbsp<button class='btn btn-sm btn-primary' onclick='joinTable("+ data.tables[i].id +")'>Join</button>");
					$("#listOfTables").append("<br><br>");
				}
			}
		}
		var tableID = data.tables.length + 1;
		$("#listOfTables").append("Create a table with: <input class='input-group-sm' type='number' id='tablePlayerCount'> players.&nbsp<button class='btn btn-sm btn-primary' onclick='createTable(" + 
			(tableID) + ")'>Create Table</button><br>");
		$("#listOfTables").append("<p id='emptyTable'>Please enter a number</p>");
		$("#emptyTable").hide();
		$("#tableList").show();
	}
});

socket.on("play", function(data) {
	if (playerTableID == data.tableID) {
		$("#hand").text("");
		$('#cards').find('option').remove().end();
		var totalWidth = document.getElementById("main").clientWidth;
		var pixel = 0;
		$.each(data.hand, function(k, v) {
			index = k + 1;
			$("#hand").append("<div style='margin-top:2px; margin-left:" + pixel + "px; float: left; z-index:" + index + "''><img class='card"+k+"' width=100 src=resources/"+v+".png /></div>");
			$(".card"+k).click(function() { playCard(k, v); return false; });
			if (pixel > -84)
				pixel = -70 - index*0.5;
			else
				pixel = -70 - index;
		});
	}
});

socket.on("updateCardsOnTable", function(data) {
	if (data.tableID == playerTableID) {  
		$("#table").text("");
		var pixel = 0;
		$.each(data.cardsOnTable, function(k, v) {
			index = k + 1;
			$("#table").append("<div style='margin-top:2px; margin-left:" + pixel + "px; float: left; z-index:" + index + "''><img class='card"+k+"' width=100 src=resources/"+v+".png /></div>");
			$(".card"+k).click(function() { playCard(k, v); return false; });
			pixel = -70;
		});
	}
});

socket.on("turn", function(data) {
	if (data.tableID == playerTableID) {
		if(data.won) {
			$("#playArea").hide();
			if (data.won == "yes") {
				$("#progressUpdate").html("<span class='label label-success'>You won - well done! Game over.</span>");
			} else {
				$("#progressUpdate").html("<span class='label label-info'>You lost - better luck next time. Game over.</span>");
			}
			gameDone = true;
		} else if (gameDone == false) {
			if(data.myturn) {
				$("#progressUpdate").html("<span class='label label-important'>It's your turn.</span>");
			} else {
				$("#progressUpdate").html("<span class='label label-info'>It's your opponent's turn.</span>");
			}
		}
	}
});

socket.on("cardInHandCount", function(data) {
	if (data.tableID == playerTableID) { 
		$("#opponentCardCount").text("");
		for (var i = 0; i < data.players.length; i++) {
			var spanClass="badge-info";
			var plural = "s";
			if (data.players[i].hand.length <= 1)
				spanClass = "badge-important";
			if (data.players[i].hand.length <= 1)
				plural = "";
			$("#opponentCardCount").append(data.players[i].name + " has <span class='badge " + spanClass + "'>"+ data.players[i].hand.length + "</span> card"+plural+" in hand.<br>");
		}
	}
});

socket.on("tableFull", function() {
	$("#tableFull").fadeIn("slow");
});

socket.on("gameover", function(data) {
	if (data.tableID == playerTableID)
		alert("Please reload the page to start a new game!");
});

$(document).ready(function() {
	$("#game").hide();
	$("#my-info").hide();
	$("#playArea").hide();
	$("#waiting").hide();
	$("#error").hide();
	$("#name").focus();
	$("#progressUpdate").hide();
	$("#takeDiscardPile").hide();
	$("#chatText").val("");

	sendMessage = function() {
		var msg = $("#chatText").val();
		var gbl = false;
		if (playerTableID === undefined)
			gbl = true;
		socket.emit("sendMessage", {global: gbl, message: msg});
		$('#chatText').val('');
	}

	joinTable = function(tableId) {
		socket.emit('connectToTable', {tableID: tableId});

		socket.on("connectedToTable", function(data) {
			$("#tableList").hide();
			$("#waiting").show();
			playerTableID = tableId;  //player belongs to this table.
		});
		
		socket.on("ready", function(data){
			$("#waiting").hide();
			$("#playArea").show();
			$("#progressUpdate").show();
		});
		
	}

	createTable = function(tableId) {
		var playerLimit = parseInt($("#tablePlayerCount").val());
		if (!Number.isNaN(playerLimit))
			socket.emit('createTable', {tableID: tableId, playerLimit: playerLimit});
		else 
			$("#emptyTable").show();
	}

	$("form").submit(function(event){
		event.preventDefault();
	});

	$("#join").click(function() {
		var name = $("#name").val();
		if (name.length>0) {
			socket.emit("connectToServer", {name: name});
			$("#login").hide();
			$("#game").show();
			$("body").css("background","url('resources/bg-game.jpg')");
			$("#my-info").show();
		} else {
			$("#error").show();
			$("#error").append('<p class="text-error">Please enter a name.</p>');
		}
	});

	$('#startGame').click(function() {
		socket.emit("readyToPlay", {tableID: playerTableID});
		$("#startGame").hide();
	});

	$("#drawCard").click(function() {
		socket.emit("drawCard", {tableID: playerTableID});
	});

});