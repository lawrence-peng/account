// Generated by CoffeeScript 1.10.0
(function() {
  var bcrypt;

  bcrypt = require('bcryptjs');

  module.exports = function(seneca, options) {
    var cmd_authenticate;
    cmd_authenticate = function(params, respond) {
      var account_id, password, response;
      account_id = params.account_id;
      password = params.password;
      response = {
        account_id: account_id,
        authenticated: false
      };
      if (account_id && password) {
        return seneca.act('role:account,cmd:identify', {
          account_id: account_id
        }, function(error, account) {
          if (account) {
            seneca.log.debug('account identified', account.id);
            return bcrypt.compare(password, account.password_hash, function(error, passed) {
              if (error) {
                seneca.log.error('password check failed:', error.message);
                seneca.act('role:error,cmd:register', {
                  from: 'account.authenticate.bcrypt.compare',
                  message: error.message
                });
                return respond(null, response);
              } else {
                seneca.log.debug('password check returned', passed);
                response.authenticated = passed;
                return respond(null, response);
              }
            });
          } else {
            seneca.log.debug('authentication failed, unidentified account', account_id);
            response.identified = false;
            return respond(null, response);
          }
        });
      } else {
        seneca.log.error('missing account_id or password', account_id, password);
        return respond(null, response);
      }
    };
    return cmd_authenticate;
  };

}).call(this);

//# sourceMappingURL=authenticate.js.map
