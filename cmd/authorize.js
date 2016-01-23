// Generated by CoffeeScript 1.10.0
(function() {
  var jwt;

  jwt = require('jsonwebtoken');

  module.exports = function(seneca, options) {
    var acl, cmd_authorize;
    acl = options.acl;
    cmd_authorize = function(params, respond) {
      var action, resource, response, secret, token;
      resource = params.resource;
      action = params.action;
      token = params.token;
      secret = options.token_secret;
      response = {
        token_verified: false,
        authorized: false
      };
      return jwt.verify(token, secret, function(error, decoded) {
        var account_id;
        if (error) {
          seneca.log.debug('token verification error', error.message);
          seneca.act('role:error,cmd:register', {
            from: 'account.authorize.jwt.verify',
            message: error.message
          });
          return respond(null, response);
        }
        seneca.log.debug('token verified');
        response.token_verified = true;
        account_id = decoded.id;
        if (!account_id) {
          seneca.log.error('failed to decode id');
          return respond(null, response);
        }
        return seneca.act('role:account,cmd:identify', {
          email: account_id
        }, function(error, account) {
          if (account) {
            response.identified_by = account_id;
            seneca.log.debug('account identified', account_id);
            seneca.log.debug('checking access', account_id, resource, action);
            return acl.isAllowed(account_id, resource, action, function(error, res) {
              if (error) {
                seneca.log.error('access check failed', error);
                return respond(null, response);
              } else {
                response.authorized = res;
                return respond(null, response);
              }
            });
          } else {
            seneca.log.debug('authorization failed, unidentified account', account_id);
            return respond(null, response);
          }
        });
      });
    };
    return cmd_authorize;
  };

}).call(this);

//# sourceMappingURL=authorize.js.map
