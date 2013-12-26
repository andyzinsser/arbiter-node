// Copyright (c) 2014 Andy Zinsser, Arbiter.me
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


// Module Dependencies
// ------------------------------------------------
var request = require('request'),
    URLS = require('../lib/urls');

// Private vars
// ------------------------------------------------
var dataStore = {},
    _accessToken,
    _gameApiKey,
    _isInitialized = false;


exports.clearCache = function(){
    dataStore = {};
};

// Event sub / pub
exports.events = {
    _handlers : {
        // TODO: This is just an example. Can be removed.
        // challenge_created: [],

        // TODO: Setup consistent error codes
        error: []
    },

    subscribe: function( event, handler ){
       if( typeof( this._handlers[event] ) == "undefined" ) {
           console.log( event + " is not a valid event" );
       }
       this._handlers[event].push( handler );
    },

    fire: function( event, data ){
        if ( this._handlers[event] ) {
            for ( var i = 0; i < this._handlers[event].length; i++ ) {
                this._handlers[event][i]( data );
            }
        }
    }
};


exports.initialize = function( args, next ) {
    if ( !args.accessToken ) {
        next('Please include a your access token in the arguments. This can be acquired here: https://www.arbiter.me/dashboard/settings/', false);
        return;
    }

    if ( !args.gameApiKey ) {
        next('Please include a your gameApiKey in the arguments. This can be acquired here: https://www.arbiter.me/dashboard/games/', false);
        return;
    }

    _accessToken = args.accessToken;
    _gameApiKey = args.gameApiKey;
    _isInitialized = true;
    next(undefined, true);
};

// Requests a match for the passed in player
//
//  PARAMS
//  playerId [string] - The arbiterId of the player requesting a match
//  filters [dictionary] - Filter keys and values to contrain matches. Ex: levels and bets
//  next - callback once a match has been found
// ------------------------------------------------

exports.requestMatch = function( playerId, filters, next ){
    var response = { success: true, errors: []};

    if (!_isInitialized) {
        response.success = false;
        response.errors.push('Please use Arbiter.initialize() before making any requests');
        next( response );
        return;
    }

    if ( !playerId ) {
        response.success = false;
        response.errors.push("Please include the playerId as the first parameter of requestMatch.");
        next( response );
        return;
    }

    request({
        url: URLS.MATCHMAKING + playerId,
        method: 'POST',
        body: JSON.stringify({game_api_key: _gameApiKey, filters: filters}),
        headers: {'Authorization': 'Token ' + _accessToken,
                  'Content-type': 'application/json',
                  'Accept': 'application/json'}
        }, function( err, res, body ) {
            if ( res.statusCode == 200 ) {
                _pollForMatchesForPlayer( playerId, next );
            }
        });
};

exports.cancelMatch = function( playerId, match, filters, next ) {
    var id = ( playerId ) ? playerId : match.uid;
    request({
        url: URLS.MATCHMAKING + id + '/cancel',
        method: 'POST',
        body: JSON.stringify({game_api_key: _gameApiKey, filters: filters}),
        headers: {'Authorization': 'Token ' + _accessToken,
                  'Content-type': 'application/json',
                  'Accept': 'application/json'}
    }, function( err, res, body ) {
        next( res, body );
    });
};


// Private Methods
// ------------------------------------------------

var _pollForMatchesForPlayer = function ( playerId, next ) {
    var interval = 0,
        time = 1000;

    var makeGetRequest = function() {
        request({
            url: URLS.MATCHMAKING + playerId,
            method: 'GET',
            body: JSON.stringify({game_api_key: _gameApiKey}),
            headers: {'Authorization': 'Token ' + _accessToken,
                  'Content-type': 'application/json',
                  'Accept': 'application/json'}
        }, function( err, res, body ) {
            var matches = JSON.parse( body ).matches;
            if ( matches.length > 0 || interval >= 4) {
                next( {success: true, matches: matches, playerId: playerId} );
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
};

