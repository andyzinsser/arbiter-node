var should = require('should'),
    request = require('request'),
    assert = require('assert'),
    arbiter = require('../lib/arbiter'),
    URLS = require('../lib/urls');


// Helper functions
// ------------------------------------------------

var bootstrapClient = function( next ) {
    var player = {
        arbiterId: undefined,
        cookieStr: ''
    };

    request({
            url: URLS.INITIALIZE_USER,
            method: 'POST',
            headers: {'Cookie': player.cookieStr}
        },
        function(err, res, body) {
            player.arbiterId = JSON.parse(body).user_id;
            if ( res.headers['set-cookie'] ) {
                player.cookieStr = res.headers['set-cookie'][0];
            }
            next( player );
        }
    );
};


// Tests
// ------------------------------------------------

describe( 'Matchmaking', function() {
    before(function( done ) {
        var initParams = {
            gameApiKey: '5b2d851616d344e68685ef9e9949e230',
            accessToken: '94f08d4a4b7ef48cd0ff878f1d34b4eddcc93392'
        };
        arbiter.initialize(initParams, function( err, success ) {
            assert.equal(success, true, 'arbiter.initialize returned error: ' + err);
            done();
        });
    });

    it.only( 'should match two users', function( done ) {
        var playerIds = [],
            filters = {arbiter_node_plugin_test_filers: '1'},
            haveCheckedIds = false;

        var checkIdsOnceFinished = function( match ) {
            haveCheckedIds = true;
            arbiter.cancelMatch( undefined, match, filters, function( res, body ) {
                assert.equal( JSON.parse( body ).success, true);
                assert.notEqual( match.players.indexOf(playerIds[0]), -1);
                assert.notEqual( match.players.indexOf(playerIds[1]), -1);
                done();
            });
        };

        bootstrapClient( function( player ) {
            playerIds.push(player.arbiterId );
            arbiter.requestMatch( player.arbiterId, filters, function( args ) {
                assert.equal(args.success, true);
                if ( playerIds.length == 2 && !haveCheckedIds) {
                    checkIdsOnceFinished(args.matches[0]);
                }
            });
        });

        bootstrapClient( function( player ) {
            playerIds.push( player.arbiterId );
            arbiter.requestMatch( player.arbiterId, filters, function( args ) {
                assert.equal(args.success, true);
                if ( playerIds.length == 2 && !haveCheckedIds ) {
                    checkIdsOnceFinished(args.matches[0]);
                }
            });
        });

    });
});

