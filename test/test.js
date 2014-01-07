var Arbiter = require('../lib/index'),
    URLS = require('../lib/urls'),
    assert = require('assert'),
    request = require('request');

if ( !process.env.ARBITER_GAME_API_KEY ) {
    throw new Error( 'Please include an ARBITER_GAME_API_KEY environment variable' );
}
if ( !process.env.ARBITER_ACCESS_TOKEN ) {
    throw new Error( 'Please include an ARBITER_ACCESS_TOKEN environment variable' );
}

var arbiter = new Arbiter({
    gameApiKey: process.env.ARBITER_GAME_API_KEY,
    accessToken: process.env.ARBITER_ACCESS_TOKEN
});


// Initializing the actual module
////////////////////////////////////////

describe( 'initializing module', function() {
    it( 'should set the accessToken and gameApiKey', function( done ) {
        assert.notEqual( arbiter, undefined );
        assert.equal( arbiter.gameApiKey, process.env.ARBITER_GAME_API_KEY );
        assert.equal( arbiter.accessToken, process.env.ARBITER_ACCESS_TOKEN );
        done();
    });
});


describe( 'arbiter.matchmaking.request', function() {
    it( 'should allow requests without filters', function( done ) {
        bootstrapFakeClient( function( player ) {
            arbiter.matchmaking.request( player.id, function( err, body ) {
                assert.equal( err, null, err );
                assert.equal( body.success, true );
                done();
            });
        });
    });

    it( 'should not find a match if there are no available matches', function( done ) {
        this.timeout(20000);
        bootstrapFakeClient( function( player ) {
            var filters = {arbiter_node_test_filter: Math.floor( Math.random() * 1000 )};
            arbiter.matchmaking.request( player.id, filters, function( err, body ) {
                assert.equal( err, null, err );
                assert.equal( body.success, true );
                assert.equal( body.match, undefined );
                done();
            });
        });
    });

    it( 'should match two players', function( done ) {
        this.timeout(20000);
        var filters = {arbiter_node_test_filter: Math.floor( Math.random() * 1000 )},
            responses = 0,
            player1 = {},
            player2 = {};

        var checkIfPlayersWhereMatchedTogether = function( matches ) {
            if ( responses == 2 ) {
                assert.notEqual( matches[0].players.indexOf(player1.id), -1 );
                assert.notEqual( matches[0].players.indexOf(player2.id), -1 );
                done();
            }
        };

        bootstrapFakeClient( function( player ) {
            player1 = player;
            arbiter.matchmaking.request( player.id, filters, function( err, body ) {
                assert.equal( err, null, err );
                assert.equal( body.success, true );
                assert.equal( body.matches.length > 0, true );
                responses ++;
                checkIfPlayersWhereMatchedTogether( body.matches );
            });
        });

        bootstrapFakeClient( function( player ) {
            player2 = player;
            arbiter.matchmaking.request( player.id, filters, function( err, body ) {
                assert.equal( err, null, err );
                assert.equal( body.success, true );
                assert.equal( body.matches.length > 0, true );
                responses ++;
                checkIfPlayersWhereMatchedTogether( body.matches );
            });
        });
    });
});

describe( 'arbiter.matchmaking.cancel', function() {
    it.only( 'should return a success when canceling match', function( done ) {
        this.timeout(20000);
        bootstrapFakeClient( function( player ) {
            filters = {arbiter_node_test_filter: Math.floor( Math.random() * 1000 )};
            arbiter.matchmaking.request( player.id, filters, function( err, body ) {
                assert.equal( body.matches.length, 0 );
                arbiter.matchmaking.cancel( player.id, filters, function( err, body ) {
                    assert.equal( body.success, true );
                    done();
                });
            });
        });
    });
});


// Helper methods
////////////////////////////////////////

var bootstrapFakeClient = function( next ) {
    var player = {
        arbiterId: undefined,
        cookieStr: ''
    };

    request({
            url: URLS.INITIALIZE_USER,
            method: 'POST',
            headers: {'Cookie': player.cookieStr}
        },
        function( err, res, body ) {
            assert.equal( res.statusCode, 200 );
            player.id = JSON.parse( body ).user_id;
            if ( res.headers['set-cookie'] ) {
                player.cookieStr = res.headers['set-cookie'][0];
            }
            next( player );
        }
    );
};
