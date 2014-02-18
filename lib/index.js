var util = require('util'),
    request = require('request'),
    URLS = require('../lib/urls');


function ArbiterError( error ) {
    Error.captureStackTrace( this, ArbiterError );
    this.error = error;
}

util.inherits( ArbiterError, Error );

ArbiterError.prototype.toString = function toString() {
    return 'ArbiterError: ' + this.error;
};

function Arbiter( options ) {
    var self = this;
    if ( !options || !options.accessToken ) {
        throw new ArbiterError( 'Please include a your access token in the arguments. This can be acquired here: https://www.arbiter.me/dashboard/settings/' );
    }
    if ( !options || !options.gameApiKey ) {
        throw new ArbiterError( 'Please include a your gameApiKey in the arguments. This can be acquired here: https://www.arbiter.me/dashboard/games/' );
    }

    self.accessToken = options.accessToken;
    self.gameApiKey = options.gameApiKey;


    // request wrapper functions
    // ------------------------------------------------

    function get( url, next ) {
        // TODO: request.get url
        var body = {err: null, body: {}};
        next( body );
    }

    function post( url, params, next ) {
        request({
                url: url,
                method: 'POST',
                body: JSON.stringify( params ),
                headers: {'Authorization': 'Token ' + self.accessToken,
                          'Content-type': 'application/json',
                          'Accept': 'application/json'}
            },
            function( err, res, body ) {
                if ( err ) {
                    next( err );
                } else {
                    if ( res.statusCode !== 200 ) {
                        next( new ArbiterError( 'Arbiter returned a ' + res.statusCode + ' response.' ));
                    } else {
                        body = JSON.parse( body );
                        if ( body.success ) {
                            next( null, body );
                        } else {
                            next( new ArbiterError( body.error || body.errors ) );
                        }
                    }
                }
            });
    }

    // private helper functions
    // ------------------------------------------------

    function _pollForMatchesForPlayer( userId, next ) {
        var interval = 0,
            time = 1000;

        var makeGetRequest = function() {
            request({
                url: URLS.MATCHMAKING + userId,
                method: 'GET',
                body: JSON.stringify({game_api_key: self.gameApiKey}),
                headers: {'Authorization': 'Token ' + self.accessToken,
                          'Content-type': 'application/json',
                          'Accept': 'application/json'}
            }, function( err, res, body ) {
                var matches = JSON.parse( body ).matches;
                body = JSON.parse( body );
                if ( body.matches.length > 0 || interval >= 4) {
                    next( null, body );
                } else {
                    time = time * 1.3;
                    interval ++;
                    setTimeout( function() {
                        makeGetRequest( userId, next );
                    }, time);
                }
            });

        };
        makeGetRequest();
    }


    // Matchmaking
    // ------------------------------------------------
    self.matchmaking = {};

    // api/v1/matchmaking/<userId>
    self.matchmaking.request = function( userId, filters, next ) {
        var url = URLS.MATCHMAKING + userId,
            params = { game_api_key: self.gameApiKey };

        if ( typeof( filters ) == 'function' ) {
            next = filters;
            filters = undefined;
        } else {
            params.filters = filters;
        }

        post( url, params, function( err, body ) {
            if ( err === null ) {
                _pollForMatchesForPlayer( userId, next );
            } else {
                next( err, body );
            }
        });
    };

    // api/v1/matchmaking/<matchId_or_userId>/cancel
    self.matchmaking.cancel = function( id, filters, next ) {
        var params = {game_api_key: self.gameApiKey};
        if ( typeof(id) == 'Object' ) {
            id = id.uid;
        }
        if ( typeof(filters) == 'function' ) {
            next = filters;
        } else {
            params.filters = filters;
        }

        post( URLS.MATCHMAKING + id + '/cancel', params, next );
    };


    // Competitions
    // ------------------------------------------------
    self.competition = {};

    // api/v1/competition/<userId>
    self.competition.request = function( userId, buyIn, filters, next ) {
        var url = URLS.COMPETITION + userId,
            params = {game_api_key: self.gameApiKey};

        if ( typeof( filters ) == 'function' ) {
            next = filters;
            filters = undefined;
        } else {
            params.filters = filters;
        }

        // TODO: Flush out the POST
        post();

    };
}



module.exports = Arbiter;
