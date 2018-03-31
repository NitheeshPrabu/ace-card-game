var socket = io.connect("https://ace-card-game.herokuapp.com");

socket.on("logging", function(data) {
  $("#updates").append("<li>"+ data.message + "</li>");
});

function playCard(key, value) {
  index = key;
  playedCard = value;
  socket.emit("playCard", {tableID:1, playedCard: playedCard, index: index});
}

socket.on("clearLog", function() {
  $("#updates").text("");
});

socket.on("play", function(data) {
  $("#hand").text("");
  $('#cards').find('option').remove().end();
  pixel = 10;
  $.each(data.hand, function(k, v) {
    index = k + 1;
    $("#hand").append("<div style='margin-top:2px; margin-left:" + pixel + "px; float: left; z-index:" + index + "''><img class='card"+k+"' width=100 src=resources/"+v+".png /></div>");
    $(".card"+k).click(function() { playCard(k, v); return false; });
    if (pixel >= 0) {
      pixel = (pixel + 37.5) * -1;
    } else {
      if (pixel <= -37.5)
        pixel = pixel -1;
    }
  });
});

socket.on("updateCardsOnTable", function(data){
  $("#table").text("");
  pixel = 10;
  $.each(data.cardsOnTable, function(k, v) {
    index = k + 1;
    $("#table").append("<div style='margin-top:2px; margin-left:" + pixel + "px; float: left; z-index:" + index + "''><img class='card"+k+"' width=100 src=resources/"+v+".png /></div>");
    $(".card"+k).click(function() { playCard(k, v); return false; });
    if (pixel >= 0) {
      pixel = (pixel + 37.5) * -1;
    } else {
      if (pixel <= -37.5)
        pixel = pixel -1;
    }
  });
});

socket.on("turn", function(data) {
  if(data.won) {
    $("#playArea").hide();
    if (data.won == "yes") {
      $("#progressUpdate").html("<span class='label label-success'>You won - well done! Game over.</span>");
    } else {
      $("#progressUpdate").html("<span class='label label-info'>You lost - better luck next time. Game over.</span>");
    }
  } else {
    if(data.myturn) {
      $("#progressUpdate").html("<span class='label label-important'>It's your turn.</span>");
      // socket.emit("preliminaryRoundCheck", {tableID: 1}); //When a player has a turn, we need to control a few items, this is what enables us to make it happen.
    } else {
      $("#progressUpdate").html("<span class='label label-info'>It's your opponent's turn.</span>");
    }
  }
});

socket.on("cardInHandCount", function(data) {
  console.log(data);
  $("#opponentCardCount").text("");
  for (var i = 0; i < data.players.length; i++) {
    var spanClass="badge-success";
    var plural = "s";
    if (data.players[i].hand.length <= 1) {
      spanClass = "badge-important";
    }
    if (data.players[i].hand.length <= 1) {
      plural = "";
    }
    $("#opponentCardCount").append(data.players[i].name + " has <span class='badge " + spanClass + "''>"+ data.players[i].hand.length + "</span> card"+plural+" in hand.<br>");
  }
});

socket.on("tableFull", function(){
  $("#tableFull").fadeIn("slow");
});

$(document).ready(function() {
  $("#tableFull").hide();
  $("#playArea").hide();
  $("#waiting").hide();
  $("#error").hide();
  $("#name").focus();
  $("#progressUpdate").hide();
  $("#startGame").hide();
  $("#takeDiscardPile").hide();
  $("form").submit(function(event){
    event.preventDefault();
  });

  $("#join").click(function() {
    var name = $("#name").val();
    if (name.length>0) {
      socket.emit("connectToServer", {name: name});
      socket.emit('connectToTable', {tableID: 1});
      $("#loginForm").hide();
      $("#tableFull").hide();
      $("#waiting").show();
      $("#startGame").show();
      socket.on("ready", function(data){
        $("#waiting").hide();
        $("#playArea").show();
        $("#progressUpdate").show();
      });
    } else {
      $("#error").show();
      $("#error").append('<p class="text-error">Please enter a name.</p>');
    }
  });


  $('#startGame').click(function() {
    socket.emit("readyToPlay", {tableID: 1});
    $("#counter").hide();
    $("#startGame").hide();
  });

  $("#drawCard").click(function() {
    socket.emit("drawCard", {tableID: 1});
  });
});