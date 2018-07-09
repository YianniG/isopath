// https://nodejs.org/api/modules.html
var fs = require('fs');
eval(fs.readFileSync('../public/js/isopath.js').toString());
eval(fs.readFileSync('../public/js/isopath-ai.js').toString());
eval(fs.readFileSync('../public/js/ai/wormtail.js').toString());
eval(fs.readFileSync('../public/js/ai/random-moves.js').toString());

var synaptic = require('synaptic');
var Architect = synaptic.Architect;

var LEARNING_RATE = 0.01;

function train_tournament(model, duration) {
  var white_wins = 0;
  var black_wins = 0;
  var draws = 0;

  for (var i = 0; i < duration; i++) {
    var isopath = new Isopath();
    var white = new Wormtail(isopath, model);
    var black = new Wormtail(isopath, model);

    var winner = play_game(isopath, white, black, 100);
    if (winner == 'white') {
      white_wins++;
    } else if (winner == 'black') {
      black_wins++;
    } else {
      draws++;
    }
    train_model(model, white.feature_history, winner == 'white');
    train_model(model, black.feature_history, winner == 'black');
  }

  return [white_wins, black_wins, draws];
}

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

function train_model(model, feature_history, won) {
  for (var features in feature_history) {
    model.activate(features);
    model.propagate(LEARNING_RATE, won); // TODO: decay this value? start weak early and strong towards the end of game - linear?, quadratic? exponential?
  }
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


var model = new Architect.Perceptron(5, 10, 10, 1);

for (var tournament_runs = 0; tournament_runs < 200; tournament_runs++) {
  console.log("tournament: " + tournament_runs);
  var train_games = 100;
  var test_games = 10;

  var [white_wins, black_wins, draws] =  train_tournament(model, train_games)
  var [model_wins, random_wins, draws] = test_random_tournament(model, test_games);

  console.log("win rate: " + (model_wins / test_games));
  console.log("loss rate: " + (random_wins / test_games));
  console.log("draw rate: " + (draws / test_games));
  console.log("total train games: " + train_games);
  console.log("total test games: " + test_games);
}

fs.writeFile("wormtail-model.json", JSON.stringify(model.toJSON()), function(err) {
    if(err) {
        return console.log(err);
    }
});
