//     Arbiter
//     http://arbiter.me
//     (c) 2013 andy@arbiter.me


// Module Dependencies
// ------------------------------------------------

var request = require('request'),
    user = require('./user.js'),
    dataStore = {};


exports.clearCache = function(){
  dataStore = {};
};


// Setup the basics
// ------------------------------------------------
var _version = 0.1,
    BASE_URL = 'https://cointoss.arbiter.me/',
    AUTH_FORM_URL = BASE_URL + 'coinbase/auth-form/',
    CREATE_ARBITER_TOKEN_URL = BASE_URL + 'api/v'+ _version +'/token/create/',
    ARBITER_TOKEN_STATUS_URL = BASE_URL + 'api/v' + _version + '/token/check-status/',
    CREATE_CHALLENGE_URL = BASE_URL + 'api/v'+ _version +'/challenge/create/',
    JOIN_CHALLENGE_URL = BASE_URL + 'api/v'+ _version +'/challenge/XXX/ante/',
    PAYOUT_CHALLENGE_URL = BASE_URL + 'api/v'+ _version +'/challenge/XXX/payout/',
    _auth_window_opened = false,
    _return_address,
    _ctt,                       // Cointoss token
    _cb_is_valid = false;       // Coinbase is authenticated


// Event sub / pub
exports.events = {
    _handlers : {
        challenge_created: [],

        // TODO: Setup consistent error codes
        error: [],

        token_set: [],
        user_added_ante: [],
        user_authenticated: [],
        challenge_completed: []
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


// Establishes a session with Arbiter for the current user
// Sends this user's ID to Arbiter.
// Arbiter should return a token for this users id.
// This stores that token as a cookie
// ------------------------------------------------
exports.connectUser = function( userId, next ) {
    var self = this,
        response = {success: true};

    // Check the session data
    if ( dataStore[userId] ) {
        response.data = {id: userId};
        next( response );
    } else {
        // Make a request to Arbiter server to get an Arbiter Session token. Then store it in the cache.
        request.get( CREATE_ARBITER_TOKEN_URL, function (error, res, body) {
            if (!error && res.statusCode == 200) {
                response.data = {id: userId};
                dataStore[userId] = {arbiter_token: JSON.parse(body).token};
            } else  {
                response.error = error;
                response.success = false;
            }
            next( response );
        });
    }
    return;
};


// Creates a new challenge on Arbiter with a wallet address to send the antes to
// ------------------------------------------------
exports.createChallenge = function( args, next ){
    console.log("arbiter.createChallenge");
    var response = { success: true },
        url;

    if ( !args.ante || !args.returnAddress ) {
        response.success = false;
        response.error = "Please specifiy the ante amount and the returnAddress";
        next( response );
        return;
    }

    url = CREATE_CHALLENGE_URL + "?ante=" + args.ante + "&max_players=" + 2 + "&return_address=" + args.returnAddress;

    console.log("Making createChallenge request");
    request.get( url, function ( error, res, body ) {
        console.log("createChallenge.next");
        var parsed = JSON.parse( body );
        if ( res.statusCode == 200 && parsed.success ) {
            console.log("createChallenge.success");
            response.challenge = parsed.challenge;
        } else {
            console.log("createChallenge.error");
            response.error = parsed;
        }
        next( response );
    });
};

var _addAnteToPot = function ( args, next ) {
    console.log("arbiter._addAnteToPot");
    var user = dataStore[args.userId],
        ante_url = JOIN_CHALLENGE_URL.replace('XXX', args.gameId) + '?arbiter_token=' + user.arbiter_token;

    // Have arbiter ante on behalf of this user
    request.post( ante_url, function ( error, res, body ) {
        var response = {success: true, errors: []};

        if ( res.statusCode === 200 ) {
            console.log('arbiter._addAnteToPot.success');
            var parsed = JSON.parse( body );
            console.log(parsed);

            // TODO:
            // Figure out why coinbase is returning this to true even though funds are not getting transferred / empty account
            // Then figure out why _addAnteToPot is getting call twice when the user clicks join-game



            if ( parsed.errors ) {
                response.success = false;
                response.errors.push( 'Coinbase Error:' + parsed.errors );
            }

            response.data = parsed;
        } else {
            console.log('arbiter._addAnteToPot.error');
            console.log(body);
            response.success = false;
            response.errors.push("The arbiter couldn't ante with your Coinbase info." +
                                 "<br>Try signing out of your Coinbase account.");
        }
        next( response );
    });
};

// Antes into a unique address for this challenge on behalf of the player.
// ------------------------------------------------
exports.ante = function ( args, next ) {
    var user = dataStore[args.userId];

    if ( user.has_valid_cb_token ) {
        console.log("arbiter.ante.has_valid_cb_token");
        // TODO: Make sure that the next getting passed around doesn't fuck with the scope at all
        _addAnteToPot( args, next );
    }

    // Check if this users arbiter_token is associated with a valid Coinbase access_token
    request.get( ARBITER_TOKEN_STATUS_URL +  '?arbiter_token=' + user.arbiter_token, function (error, res, body ) {
        console.log("arbiter.ante.status");
        var response = {success: true, errors: []},
            parsed,
            auth_window_settings;

        if ( res.statusCode === 200 ) {
            parsed = JSON.parse( body );

            if ( parsed.success && parsed.is_valid ) {
                console.log("arbiter.ante.status.success");
                console.log(parsed);
                user.has_valid_cb_token = true;
                _addAnteToPot( args, next );
            } else {
                console.log("arbiter.ante.error 1");
                console.log( parsed );
                response.success = false;
                auth_window_settings = [AUTH_FORM_URL + '?arbiter_token=' + user.arbiter_token, '',
                    'left=100,width=400,height=600,menubar=no,resizable=no,scrollbars=no,titlebar=no,top=100'];

                response.data = {auth_window_settings: auth_window_settings};
                response.errors.push("Looks like your arbiter is on break and couldn't add your ante.");
                next( response );
            }
        } else {
            console.log('arbiter.ante.status.error 2');
            response.errors.push("The arbiter is unable to check your user's status right now. He's been notified," +
                                 " and is looking into the issue now.");
            response.success = false;
            next ( response );
        }
    });
};


// Pays out the the pot to the winning player
// ------------------------------------------------
exports.payout = function ( args, next ) {
    var url = PAYOUT_CHALLENGE_URL.replace('XXX', args.address) + '0?winner_address=' + args.winner;

    request.post( url, function (err, res, body ) {
        var response = {success: true},
            parsed;

        if ( res.statusCode === 200 ) {
            parsed = JSON.parse( body );

            if ( parsed.success ) {
                console.log("arbiter.payout.success");
                response.data = parsed;
            } else {
                response.success = false;
                response.errors = parsed.errors;
                response.data = parsed;
            }
        }
        next( response );
    });
};

