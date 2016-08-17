// Generated by CoffeeScript 1.10.0
(function() {
  var async;

  async = require('async');

  module.exports = function(seneca, options) {
    var cmd_update;
    cmd_update = function(args, respond) {
      var accountId, account_records, new_password, new_status, updated;
      new_status = args.status;
      new_password = args.password;
      accountId = args.account_id;
      account_records = seneca.make(options.zone, options.base, 'account');
      updated = [];
      return account_records.load$(accountId, function(error, acc) {
        var message;
        if (error) {
          seneca.log.error('error while loading account', accountId, error.message);
          return respond(error);
        }
        if (!acc) {
          message = 'tried to update nonexistent account ' + accountId;
          seneca.log.error(message);
          return respond(new Error(message));
        }
        seneca.log.debug('updating account', acc.id);
        return async.waterfall([
          function(callback) {
            if (new_status && new_status !== acc.status) {
              seneca.log.debug('updating status...');
              acc.status = new_status;
              updated.push('status');
            }
            return callback(null, acc);
          }, function(acc, callback) {
            if (new_password) {
              seneca.log.debug('updating password...');
              updated.push('password');
              return seneca.act('role:account,cmd:encrypt', {
                subject: new_password
              }, function(error, res) {
                acc.hash = res.hash;
                return callback(error, acc);
              });
            } else {
              return callback(null, acc);
            }
          }
        ], function(error, acc) {
          return acc.save$(function(error, saved_acc) {
            if (error) {
              seneca.log.error('account record update failed:', error.message);
              return respond(error, null);
            }
            if (saved_acc) {
              saved_acc.updated = updated;
            }
            return respond(null, saved_acc);
          });
        });
      });
    };
    return cmd_update;
  };

}).call(this);

//# sourceMappingURL=update.js.map
