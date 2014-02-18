var _VERSION = 1,
    _BASE_URL = 'https://www.arbiter.me/api/v' + _VERSION + '/',
    URLS = {
        INITIALIZE_USER: _BASE_URL + 'user/initialize',
        MATCHMAKING: _BASE_URL + 'matchmaking/',
        COMPETITION: _BASE_URL + 'competition/'
    };

module.exports = URLS;
