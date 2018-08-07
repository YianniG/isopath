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
        save_history(white, black, true);
    } else if (winner == 'black') {
        black_wins++;
        save_history(white, black, false);
    } else {
        draws++;
    }
    train_model(model, white.game_history, winner == 'white' ? 1 : -1);
    train_model(model, black.game_history, winner == 'black' ? 1 : -1);
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

function train_model(model, game_history, won) {
    var history_length = game_history.length;

    for (var i = 0; i < history_length; i++) {
        model.activate(game_history[i]);
        var score =  won * Math.exp(i / history_length) / Math.exp(1); // Exponential growth curve
        model.propagate(LEARNING_RATE, score);
    }
}

function play_game(isopath, white, black, maxturns) {
    for (var i = 0; i < maxturns; i++) {
        try {
            isopath.playMove(white.move());
        } catch(e) {
            console.log(e);
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
            return isopath.winner();
    }

    return '';
}


var tournament_max_runs = process.argv[2];
var tournament_length = process.argv[3];
var test_length = process.argv[4];
var model_index = process.argv[5];
var model_name = process.argv[6];

if (model_name == null) {
  model_name = Math.floor(Math.random() * 100000);
}

if (model_index == null) {
  model_index = 0;
}

var model = [
  new Architect.Perceptron(55, 55, 55, 35, 1),
  new Architect.Perceptron(55, 55, 35, 1),
  new Architect.Perceptron(55, 35, 1),
  new Architect.Perceptron(55, 55, 1),
  new Architect.Perceptron(55, 110, 100, 35, 1),
  new Architect.Perceptron(55, 110, 35, 1),
  new Architect.Perceptron(55, 100, 100, 100, 100, 1),
][model_index];

console.log("train model for " + tournament_max_runs);
console.log("tournaments of length " + tournament_length);
console.log("test of length " + test_length);

for (var tournament_runs = 0; tournament_runs < tournament_max_runs; tournament_runs++) {
    console.log("tournament: " + tournament_runs);
    var train_games = tournament_length;
    var test_games = test_length;

    var [white_wins, black_wins, draws] =  train_tournament(model, train_games)
    var [model_wins, random_wins, draws] = test_random_tournament(model, test_games);

    console.log("win rate: " + (model_wins / test_games));
    console.log("loss rate: " + (random_wins / test_games));
    console.log("draw rate: " + (draws / test_games));
    console.log("total train games: " + train_games);
    console.log("total test games: " + test_games);
}

fs.writeFile("wormtail-model-" + model_name + ".json", JSON.stringify(model.toJSON()), function(err) {
    if(err) {
        return console.log(err);
    }
});

function save_history(ai1, ai2, ai1_won) {
    fs.appendFile("game-history-" + model_name + ".json", JSON.stringify({"game": ai1.game_history, "outcome": ai1_won}) + '\n', function(err) {
        if(err) {
            return console.log(err);
        }
    });
    fs.appendFile("game-history-" + model_name + ".json", JSON.stringify({"game": ai2.game_history, "outcome": !ai1_won}) + '\n', function(err) {
        if(err) {
            return console.log(err);
        }
    });
}
