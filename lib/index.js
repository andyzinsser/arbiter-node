// Copyright (c) 2014 Andy Zinsser, Arbiter Solutions, Inc (arbiter.me)
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
// ------------------------------------------------

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

    function _pollForMatchesForPlayer( playerId, next ) {
        var interval = 0,
            time = 1000;

        var makeGetRequest = function() {
            request({
                url: URLS.MATCHMAKING + playerId,
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
                        makeGetRequest( playerId, next );
                    }, time);
                }
            });

        };
        makeGetRequest();
    }


    // Matchmaking
    // ------------------------------------------------
    self.matchmaking = {};

    // /api/v1/matchmaking/<playerId>
    self.matchmaking.request = function( playerId, filters, next ) {
        var url = URLS.MATCHMAKING + playerId,
            params = { game_api_key: self.gameApiKey };

        if ( typeof( filters ) == 'function' ) {
            next = filters;
            filters = undefined;
        } else {
            params.filters = filters;
        }

        post( url, params, function( err, body ) {
            if ( err === null ) {
                _pollForMatchesForPlayer( playerId, next );
            } else {
                next( err, body );
            }
        });
    };

    // /api/v1/matchmaking/<matchId_or_playerId>/cancel
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


    // TODO: Matches (escrow matches NOT matchmaking)
    // ------------------------------------------------
}



module.exports = Arbiter;
