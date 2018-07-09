function Wormtail(isopath, model) {
    this.isopath = isopath;
    this.candidate_move_size = 10;
    this.feature_history = [];
    this.model = model;
}

Wormtail.prototype.randplace = function() {
    return this.isopath.all_places[Math.floor(Math.random() * this.isopath.all_places.length)];
};

Wormtail.prototype.generate_move = function() {
    var ip = this.isopath;
    var me = ip.curplayer;
    var you = ip.other[me];

    var move = [];

    // always capture a piece if we can
    for (var i = 0; i < ip.board[you].length; i++) {
        if (ip.isLegalMove([["capture",ip.board[you][i]]], 'halfmove-check')) {
            move.push(["capture",ip.board[you][i]]);
            break; // break because you're only allowed one capture per turn
        }
    }

    // generate random candidate moves until we find one that is legal
    for (var i = 0; i < 10000; i++) {
        var thismove;

        // move a tile from a random location to another random location
        do {
            thismove = [["tile",this.randplace(),this.randplace()]];
        } while(!ip.isLegalMove(move.concat(thismove), 'halfmove-check'));

        // only move a piece if we didn't already capture a piece
        if (move.length == 0) {
            // choose a random location that has one of our pieces
            var from = ip.board[me][Math.floor(Math.random() * ip.board[me].length)];

            // get the list of adjacent tiles
            var adjs = ip.adjacent[from];

            // choose a random adjacent tile
            var to = adjs[Math.floor(Math.random() * adjs.length)];

            thismove.push(["piece",from,to]);
        }

        // if our full move is legal, return it
        if (ip.isLegalMove(move.concat(thismove)))
            return move.concat(thismove);
    }

    // can't find a legal move after 10k attempts:
    throw "can't find a legal move";
};

Wormtail.prototype.score = function(feature_vector) {
    return this.model.activate(feature_vector);
};

Wormtail.prototype.tile_at_height = function(height) {
    var count = 0;
    for (var i = 0; i < this.isopath.all_places.length; i++) {
        if (this.isopath.board[this.isopath.all_places[i]] == height) {
            count++;
        }
    }
};

Wormtail.prototype.furthest_piece = function(player) {
    var homerow = this.isopath.homerow[player][0].charCodeAt(0);

    var piece_distance = [];
    this.isopath.board[player].forEach(function(value, _, _) {
        piece_distance.push(Math.abs(homerow - value.charCodeAt(0)));
    }, this);

    return Math.max(...piece_distance);
};

Wormtail.prototype.threatened_pieces = function(player) {
    var pieces = this.isopath.board[player];
    var count = 0;
    pieces.forEach(function(myPiece, _, _) {
        var adjacent = 0;
        this.isopath.adjacent[myPiece].forEach(function(yourPiece, _, _) {
            if (this.isopath.board[this.isopath.other[player]].indexOf(yourPiece) > -1) {
                adjacent++;
            }
        }, this);

        if (adjacent > 1) {
            count++;
        }
    }, this);

    return count;
};

Wormtail.prototype.potentially_threatened_pieces = function(player) {
  // TODO: Implement
  return 0;
};

Wormtail.prototype.to_feature_vector = function(move) {
    this.isopath.playMove(move, 'no-legality-check');
    var me = this.isopath.curplayer;

    var myPieces                      = this.isopath.board[me].length;
    var tilesMyLevel                  = this.tile_at_height(this.isopath.playerlevel[me]);
    var distanceMyFurthestPiece       = this.furthest_piece(me);
    var myThreatenedPieces            = this.threatened_pieces(me);
    var myPotentiallyThreatenedPieces = this.potentially_threatened_pieces(me);


    var you = this.isopath.other[me];

    var yourPieces                      = this.isopath.board[you].length;
    var tilesYourLevel                  = this.tile_at_height(this.isopath.playerlevel[you]);
    var distanceYourFurthestPiece       = this.furthest_piece(you);
    var yourThreatenedPieces            = this.threatened_pieces(you);
    var yourPotentiallyThreatenedPieces = this.potentially_threatened_pieces(you)

    this.isopath.undoMove();

    return [
        myPieces,
        tilesMyLevel,
        distanceMyFurthestPiece,
        myThreatenedPieces,
        myPotentiallyThreatenedPieces,
        yourPieces,
        tilesYourLevel,
        distanceYourFurthestPiece,
        yourThreatenedPieces,
        yourPotentiallyThreatenedPieces
    ];
};

Wormtail.prototype.move = function() {
    var candidate_moves = [];
    for (var i = 0; i < this.candidate_move_size; i++) {
        candidate_moves.push(this.generate_move());
    }

    var candidate_move_features = [];
    candidate_moves.forEach(function(move, _, _) {
        candidate_move_features.push(this.to_feature_vector(move));
    }, this);

    var candidate_move_scores = [];
    candidate_move_features.forEach(function(feature, _, _) {
        candidate_move_scores.push(this.score(feature));
    }, this);


    var index = indexOfMax(candidate_move_scores);
    this.feature_history.push(candidate_move_features[index]);
    return candidate_moves[index];
};

IsopathAI.register_ai('wormtail', 'Wormtail', function(isopath) {
    return new Wormtail(isopath, /*Load latest model from here*/);
});

function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}
