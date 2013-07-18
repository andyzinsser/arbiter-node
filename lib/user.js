var _user;

// Creates a singleton instance of this user
// ------------------------------------------------
exports.getOrCreate = function( args, next ) {
    var baseUser = {
        id: args.id,
        has_valid_cb_token: false
    };
    var user = _user || baseUser;
    _user = user;
    next(user);
};
