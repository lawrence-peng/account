// Generated by CoffeeScript 1.10.0
(function() {
  var async;

  async = require('async');

  module.exports = function(seneca, options) {
    var acl, cmd_authorize;
    acl = options.acl;
    cmd_authorize = function(args, respond) {
      var account, accountId, action, resource, response, token;
      resource = args.resource;
      action = args.action;
      token = args.token;
      accountId = args.accountId;
      account = seneca.pin({
        role: 'account',
        cmd: '*'
      });
      response = {
        authorized: false
      };
      return async.waterfall([
        function(callback) {
          if (token) {
            return account.verify({
              token: token
            }, function(error, res) {
              if (!res.decoded || !res.decoded.id) {
                seneca.log.error('failed to decode id');
                return respond(null, response);
              }
              return callback(null, res.decoded.id);
            });
          } else {
            return callback(null, null);
          }
        }
      ], function(error, decodedAccouintId) {
        if (decodedAccouintId) {
          accountId = decodedAccouintId;
        }
        if (!accountId) {
          seneca.log.debug('accountId not provided');
          return respond(null, response);
        }
        return account.get({
          account_id: accountId
        }, function(error, account) {
          if (account) {
            seneca.log.debug('checking access', account.id, resource, action);
            return acl.addUserRoles(accountId, [account.status], function(error) {
              if (error) {
                seneca.log.error('adding role to account failed:', error.message);
                return respond(error, null);
              }
              return acl.isAllowed(accountId, resource, action, function(error, res) {
                if (error) {
                  seneca.log.error('access check failed', error);
                  return respond(null, response);
                } else {
                  response.authorized = res;
                  return respond(null, response);
                }
              });
            });
          } else {
            seneca.log.debug('authorization failed, unidentified account', accountId);
            return respond(null, response);
          }
        });
      });
    };
    return cmd_authorize;
  };

}).call(this);

//# sourceMappingURL=authorize.js.map
