var should = require('should');


// Example test
// TODO: Make real
var inc = function(value) {
    return value += 1;
};
describe('Next prime number', function() {
    var next;

    before(function(done) {
        next = inc(1);
        done();
    });

    it('should equal 2', function() {
        next.should.equal(2);
    });
});
