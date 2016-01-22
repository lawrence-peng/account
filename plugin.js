// Generated by CoffeeScript 1.10.0
(function() {
  var authenticate, authorize, delete_, identify, login, register, util;

  authenticate = require('./cmd/authenticate');

  authorize = require('./cmd/authorize');

  identify = require('./cmd/identify');

  login = require('./cmd/login');

  register = require('./cmd/register');

  delete_ = require('./cmd/delete');

  util = require('./util');

  module.exports = function(options) {
    var role, seneca;
    seneca = this;
    role = 'account';
    seneca.add("init:" + role, function(msg, respond) {
      var required;
      required = ['starter_role', 'token_secret', 'acl'];
      util.check_options(options, required);
      return respond();
    });
    seneca.add("role:" + role + ",cmd:authenticate", authenticate(seneca, options));
    seneca.add("role:" + role + ",cmd:authorize", authorize(seneca, options));
    seneca.add("role:" + role + ",cmd:identify", identify(seneca, options));
    seneca.add("role:" + role + ",cmd:login", login(seneca, options));
    seneca.add("role:" + role + ",cmd:register", register(seneca, options));
    seneca.add("role:" + role + ",cmd:delete", delete_(seneca, options));
    return {
      name: role
    };
  };

}).call(this);

//# sourceMappingURL=plugin.js.map
