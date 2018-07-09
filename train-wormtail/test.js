// https://nodejs.org/api/modules.html
var fs = require('fs');
eval(fs.readFileSync('../public/js/isopath.js').toString());
eval(fs.readFileSync('../public/js/isopath-ai.js').toString());
eval(fs.readFileSync('../public/js/ai/wormtail.js').toString());
eval(fs.readFileSync('../public/js/ai/random-moves.js').toString());

var synaptic = require('synaptic');
var Network = synaptic.Network;

function test_random_tournament(model, duration) {
  var model_wins = 0;
  var random_wins = 0;
  var draws = 0;

  for (var i = 0; i < duration; i++) {
    var isopath = new Isopath();

    var white = i % 2 == 0 ? new Wormtail(isopath, model) : new RandomMoves(isopath);
    var black = i % 2 == 0 ? new RandomMoves(isopath) : new Wormtail(isopath, model);

    var winner = play_game(isopath, white, black, 100);
    if (winner == 'white') {
        if (i % 2 == 0) {
            model_wins++;
        } else {
            random_wins++;
        }
    } else if (winner == 'black') {
        if (i % 2 != 0) {
            model_wins++;
        } else {
            random_wins++;
        }
    } else {
        draws++;
    }
  }

  return [model_wins, random_wins, draws];
}

function play_game(isopath, white, black, maxturns) {
  for (var i = 0; i < maxturns; i++) {
    try {
      isopath.playMove(white.move());
    } catch(e) {
      //console.log("Invalid move from white.");
      return 'black';
    };

    if (isopath.winner())
      return isopath.winner();

    try {
      isopath.playMove(black.move());
    } catch(e) {
      //console.log("Invalid move from black.");
      return 'white';
    };

    if (isopath.winner())
      return isopath.winner(); }

  return '';
}


fs.readFile("wormtail-model.json", {encoding: 'utf-8'}, function(err,data){
    var model = new Network.fromJSON(JSON.parse(data))
    var test_games = process.argv[2];
    console.log("Test for " + test_games + " games");

    var [model_wins, random_wins, draws] = test_random_tournament(model, test_games);
    console.log("win rate: " + (model_wins / test_games));
    console.log("loss rate: " + (random_wins / test_games));
    console.log("draw rate: " + (draws / test_games));
    console.log("total test games: " + test_games);
});
