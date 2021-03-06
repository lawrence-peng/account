// Generated by CoffeeScript 1.10.0
(function() {
  var account, assert, bcrypt, jwt, log_mode, moment, options, seneca, seneca_entity, sinon, token_secret, util;

  assert = require('chai').assert;

  bcrypt = require('bcryptjs');

  sinon = require('sinon');

  jwt = require('jsonwebtoken');

  moment = require('moment');

  util = require('../util');

  seneca_entity = require('../node_modules/seneca/lib/entity').Entity.prototype;

  token_secret = 'КI7(#*ØḀQ#p%pЗRsN?';

  options = {
    zone: 'zone',
    base: 'base',
    test: true,
    token: {
      secret: token_secret,
      jwtNoTimestamp: true
    },
    registration: {
      starter_status: 'new'
    }
  };

  log_mode = process.env.TEST_LOG_MODE || 'quiet';

  seneca = require('seneca')({
    log: log_mode,
    debug: {
      undead: true,
      short_logs: true,
      fragile: true
    }
  }).use('../plugin', options).client();

  account = seneca.pin({
    role: 'account',
    cmd: '*'
  });

  describe('register', function() {
    it('registers new account with password and assert no password in response', function(done) {
      return account.register({
        email: 'gOOd@email.com',
        password: 'pass'
      }, function(error, new_account) {
        assert.equal(new_account.email, 'good@email.com');
        assert.isNull(error);
        assert.isUndefined(new_account.password);
        assert.equal(new_account.registered_at, moment().format());
        assert.equal(new_account.status, 'new');
        return jwt.verify(new_account.token, token_secret, function(error, decoded) {
          assert.equal(decoded.id, new_account.id);
          assert.equal(decoded.aud, 'email');
          return done();
        });
      });
    });
    it('registers a new account without password and with `confirmed` status', function(done) {
      return account.register({
        email: 'conf@email.com',
        status: 'confirmed'
      }, function(error, new_account) {
        assert.equal(new_account.email, 'conf@email.com');
        assert.equal(new_account.status, 'confirmed');
        return done();
      });
    });
    it('fails if email is invalid', function(done) {
      return account.register({
        email: 'bad_email.com',
        password: 'pass'
      }, function(error, res) {
        assert.isNull(error);
        assert.equal(res.message, 'invalid email');
        return done();
      });
    });
    it('fails when player is already registered', function(done) {
      return account.register({
        email: 'already@there.com'
      }, function(error, new_account) {
        if (new_account) {
          return account.register({
            email: 'already@there.com',
            password: 'pass'
          }, function(error, res) {
            assert.isNull(error);
            assert.equal(res.message, 'account already registered');
            return done();
          });
        }
      });
    });
    it('generates new password if its not set', function(done) {
      return account.register({
        email: 'no@pass.com'
      }, function(error, new_user) {
        assert.equal(new_user.password.length, 8);
        return done();
      });
    });
    return it('fails if there is a storage error', function(done) {
      var stub;
      stub = sinon.stub(seneca_entity, 'save$', function(callback) {
        return callback(new Error('seneca save$ error'));
      });
      return account.register({
        email: 'good3@email.com',
        password: 'pass'
      }, function(error, new_user) {
        stub.restore();
        assert.isNull(new_user);
        assert.equal(error.message, 'seneca: Action cmd:register,role:account failed: seneca save$ error.');
        return done();
      });
    });
  });

  describe('encrypt', function() {
    it('fails if there is a salt generation error', function(done) {
      var stub;
      stub = sinon.stub(bcrypt, 'genSalt', function(length, callback) {
        return callback(new Error('bcrypt salt generation error'));
      });
      return account.encrypt({
        subject: 'pass'
      }, function(error, res) {
        stub.restore();
        assert.isNull(res);
        assert.equal(error.message, 'seneca: Action cmd:encrypt,role:account failed: bcrypt salt generation error.');
        return done();
      });
    });
    return it('fails if there is a hash generation error', function(done) {
      var stub;
      stub = sinon.stub(bcrypt, 'hash', function(password, salt, callback) {
        return callback(new Error('bcrypt hash generation error'));
      });
      return account.encrypt({
        subject: 'pass'
      }, function(error, res) {
        stub.restore();
        assert.isNull(res);
        assert.equal(error.message, 'seneca: Action cmd:encrypt,role:account failed: bcrypt hash generation error.');
        return done();
      });
    });
  });

  describe('authenticate', function() {
    var email;
    email = 'newest@kid.com';
    before(function(done) {
      return account.register({
        email: email,
        password: 'somepassword'
      }, function(error, res) {
        return done();
      });
    });
    it('returns true if password is correct', function(done) {
      return account.authenticate({
        email: email,
        password: 'somepassword'
      }, function(error, result) {
        assert.isOk(result.id);
        assert.equal(result.email, email);
        return done();
      });
    });
    it('returns true if email is set uppercase', function(done) {
      return account.authenticate({
        email: 'NEWEST@kid.com',
        password: 'somepassword'
      }, function(error, result) {
        assert.isOk(result.id);
        assert.equal(result.email, email);
        return done();
      });
    });
    it('returns false if password is bad', function(done) {
      return account.authenticate({
        email: email,
        password: 'bad'
      }, function(error, result) {
        assert.isNull(result);
        return done();
      });
    });
    it('returns false if password is not sent', function(done) {
      return account.authenticate({
        email: email
      }, function(error, result) {
        assert.isNull(result);
        return done();
      });
    });
    it('returns false if account is unidentified', function(done) {
      return account.authenticate({
        email: 'doesntexist',
        password: 'doesntmatter'
      }, function(error, result) {
        assert.isNull(result);
        return done();
      });
    });
    return it('returns false if password sent is a float', function(done) {
      return account.authenticate({
        email: email,
        password: 20.00
      }, function(error, result) {
        assert.isNull(result);
        return done();
      });
    });
  });

  describe('identify', function() {
    var email, hash, id;
    hash = null;
    id = null;
    email = 'another@kid.com';
    before(function(done) {
      return account.register({
        email: email,
        password: 'somepassword'
      }, function(error, res) {
        hash = res.hash;
        id = res.id;
        return done();
      });
    });
    it('returns account info if there is one', function(done) {
      return account.identify({
        email: email
      }, function(error, acc) {
        assert.equal(email, acc.email);
        assert.equal(hash, acc.hash);
        assert.equal(id, acc.id);
        return done();
      });
    });
    it('returns null if there is no account', function(done) {
      return account.identify({
        email: 'no@account.com'
      }, function(error, res) {
        assert.equal(null, res);
        return done();
      });
    });
    return it('returns null if there was an error while loading record', function(done) {
      var stub;
      stub = sinon.stub(seneca_entity, 'list$', function(filter, callback) {
        var error;
        error = new Error('entity load error');
        return callback(error);
      });
      return account.identify({
        email: email
      }, function(error, res) {
        assert.isNull(res);
        stub.restore();
        return done();
      });
    });
  });

  describe('issue_token', function() {
    var id;
    id = null;
    before(function(done) {
      return account.register({
        email: 'logged@in.com'
      }, function(error, res) {
        id = res.id;
        return done();
      });
    });
    it('allows any payload to be encoded', function(done) {
      return account.issue_token({
        account_id: id,
        payload: {
          any: 'value'
        }
      }, function(error, res) {
        return jwt.verify(res.token, token_secret, function(error, decoded) {
          assert.equal(decoded.id, id);
          assert.equal(decoded.aud, 'web');
          assert.equal(decoded.any, 'value');
          return done();
        });
      });
    });
    return it('returns a confirmation token', function(done) {
      return account.issue_token({
        account_id: id,
        aud: 'email'
      }, function(error, res) {
        return jwt.verify(res.token, token_secret, function(error, decoded) {
          assert.equal(decoded.id, id);
          assert.equal(decoded.aud, 'email');
          return done();
        });
      });
    });
  });

  describe('get', function() {
    return it('returns error if it failed to get record from storage', function(done) {
      var id;
      id = null;
      return account.register({
        email: 'failed@user.com',
        password: 'authpass'
      }, function(error, res) {
        var stub;
        id = res.id;
        stub = sinon.stub(seneca_entity, 'load$', function(id, callback) {
          error = new Error('seneca load$ error');
          return callback(error);
        });
        return account.get({
          account_id: id
        }, function(error) {
          assert.include(error.message, 'seneca load$ error');
          stub.restore();
          return done();
        });
      });
    });
  });

  describe('update', function() {
    var id;
    id = null;
    before(function(done) {
      return account.register({
        email: 'to_update@user.com',
        password: 'authpass'
      }, function(error, res) {
        id = res.id;
        return done();
      });
    });
    it('updates a user status to `confirmed`', function(done) {
      return account.update({
        account_id: id,
        status: 'confirmed'
      }, function(error, upd_acc) {
        assert.equal(upd_acc.status, 'confirmed');
        assert.equal(upd_acc.updated[0], 'status');
        return done();
      });
    });
    it('does not actually update again the user status to `confirmed`', function(done) {
      return account.update({
        account_id: id,
        status: 'confirmed'
      }, function(error, upd_acc) {
        assert.equal(upd_acc.status, 'confirmed');
        assert.equal(upd_acc.updated.length, 0);
        return done();
      });
    });
    it('updates a user password', function(done) {
      return account.update({
        account_id: id,
        password: 'newpass'
      }, function(error, upd_acc) {
        assert.equal(upd_acc.email, 'to_update@user.com');
        assert.equal(upd_acc.updated[0], 'password');
        return account.authenticate({
          email: 'to_update@user.com',
          password: 'newpass'
        }, function(error, res) {
          assert.isOk(res.id);
          assert.equal(res.email, 'to_update@user.com');
          return done();
        });
      });
    });
    it('fails to update if there is a load error', function(done) {
      var stub;
      stub = sinon.stub(seneca_entity, 'load$', function(id, callback) {
        var error;
        error = new Error('seneca load$ error');
        return callback(error);
      });
      return account.update({
        account_id: id,
        password: 'newestpass'
      }, function(error, upd_acc) {
        assert.include(error.message, 'seneca load$ error');
        stub.restore();
        return done();
      });
    });
    it('fails to update if there is a save$ error', function(done) {
      var stub;
      stub = sinon.stub(seneca_entity, 'save$', function(callback) {
        var error;
        error = new Error('seneca save$ error');
        return callback(error);
      });
      return account.update({
        account_id: id,
        password: 'newestpass'
      }, function(error, upd_acc) {
        assert.include(error.message, 'seneca save$ error');
        stub.restore();
        return done();
      });
    });
    return it('fails to update if there is no such accountId', function(done) {
      return account.update({
        account_id: 'WERD01',
        password: 'newestpass'
      }, function(error, upd_acc) {
        assert.include(error.message, 'tried to update nonexistent account WERD01');
        return done();
      });
    });
  });

  describe('delete', function() {
    var id;
    id = null;
    before(function(done) {
      return account.register({
        email: 'victim@player.com',
        password: 'authpass'
      }, function(error, res) {
        return account.identify({
          email: 'victim@player.com'
        }, function(error, res) {
          id = res.id;
          return done();
        });
      });
    });
    it('deletes a registered account and makes sure it is not present any more', function(done) {
      return account["delete"]({
        account_id: id
      }, function(error, res) {
        assert.isNull(error);
        assert.isNull(res);
        return account.identify({
          email: 'victim@player.com'
        }, function(error, res) {
          assert.notOk(res);
          return done();
        });
      });
    });
    it('returns nothing id there is no such account', function(done) {
      return account["delete"]({
        account_id: 'stranger@player.com'
      }, function(error, res) {
        assert.isNull(error);
        assert.isNull(res);
        return done();
      });
    });
    return it('returns error if deletion failed', function(done) {
      var stub;
      stub = sinon.stub(seneca_entity, 'remove$', function(id, callback) {
        var error;
        error = new Error('entity removal error');
        return callback(error);
      });
      return account["delete"]({
        account_id: id
      }, function(error, res) {
        stub.restore();
        assert.equal(error.message, 'seneca: Action cmd:delete,role:account failed: entity removal error.');
        assert.isNull(res);
        return done();
      });
    });
  });

  describe('util.generate_password', function() {
    return it('throws an error if length is more than 256', function(done) {
      var bad_gen_pass;
      bad_gen_pass = function() {
        return util.generate_password(8, 'abcdefABCDEF&^$012345_*+abcdefABCDEF&^$012345_*+abcdefABCDEF&^$012345_*+' + 'abcdefABCDEF&^$012345_*+abcdefABCDEF&^$012345_*+abcdefABCDEF&^$012345_*+a' + 'bcdefABCDEF&^$012345_*+abcdefABCDEF&^$012345_*+abcdefABCDEF&^$012345_*+abcde' + 'fABCDEF&^$012345_*+abcdefABCDEF&^$012345_*+abcdefABCDEF&^$012345_*+');
      };
      assert.throws(bad_gen_pass);
      return done();
    });
  });

  describe('util.check_options', function() {
    it('throws an error if a required option is not present', function(done) {
      var required;
      required = ['module.required'];
      options = {
        module: {
          non_required: 'some_value'
        }
      };
      assert.throws(function() {
        return util.check_options(options, required);
      }, 'required option module.required not defined');
      return done();
    });
    return it('does not throw errors if all required options are present', function(done) {
      var required;
      required = ['required.one', 'required.two'];
      options = {
        required: {
          one: 1,
          two: 2
        }
      };
      assert.doesNotThrow(function() {
        return util.check_options(options, required);
      });
      return done();
    });
  });

}).call(this);

//# sourceMappingURL=account.test.js.map
