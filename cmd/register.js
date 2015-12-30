// Generated by CoffeeScript 1.10.0
(function() {
  var bcrypt, util, validator;

  bcrypt = require('bcryptjs');

  validator = require('validator');

  util = require('./../util');

  module.exports = function(seneca, options) {
    var account, acl, cmd_register, password_generated, password_length, starter_role;
    acl = options.acl;
    starter_role = options.starter_role;
    password_length = options.password_length || 8;
    password_generated = false;
    account = seneca.pin({
      role: 'account',
      cmd: '*'
    });
    cmd_register = function(args, respond) {
      var email;
      email = args.email;
      if (!validator.isEmail(email)) {
        seneca.log.warn('bad email', email);
        return respond(null, null);
      }
      return account.identify({
        account_id: email
      }, function(error, account) {
        var password;
        if (account) {
          seneca.log.warn('account already registered', account.id);
          return respond(null, null);
        } else {
          password = args.password;
          if (!password) {
            seneca.log.debug('generating password');
            password = util.generate_password(password_length);
            password_generated = true;
          }
          return bcrypt.genSalt(10, function(error, salt) {
            if (error) {
              seneca.log.error('salt generation failed:', error.message);
              seneca.act('role:error,cmd:register', {
                from: 'account.register.bcrypt.genSalt',
                message: error.message
              });
              return respond(error, null);
            }
            return bcrypt.hash(password, salt, function(error, hash) {
              if (error) {
                seneca.log.error('password hash failed:', error.message);
                seneca.act('role:error,cmd:register', {
                  from: 'account.register.bcrypt.hash',
                  message: error.message
                });
                return respond(error, null);
              }
              seneca.log.debug('assigning starter role', starter_role);
              return acl.addUserRoles(email, [starter_role], function(error) {
                var new_account;
                if (error) {
                  seneca.log.error('adding starter role to new account failed:', error.message);
                  seneca.act('role:error,cmd:register', {
                    from: 'account.register.acl.addUserRoles',
                    message: error.message,
                    args: {
                      email: email,
                      role: starter_role
                    }
                  });
                  return respond(error, null);
                } else {
                  new_account = seneca.make('account');
                  new_account.id = email;
                  new_account.password_hash = hash;
                  return new_account.save$(function(error, saved_account) {
                    if (error) {
                      seneca.log.error('new account record failed:', error.message);
                      seneca.act('role:error,cmd:register', {
                        from: 'account.register.new_account.save$',
                        message: error.message,
                        args: {
                          new_account: new_account
                        }
                      });
                      respond(error, null);
                    }
                    if (saved_account) {
                      if (password_generated) {
                        saved_account.password = password;
                      }
                      return respond(null, saved_account);
                    }
                  });
                }
              });
            });
          });
        }
      });
    };
    return cmd_register;
  };

}).call(this);

//# sourceMappingURL=register.js.map
