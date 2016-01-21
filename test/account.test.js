// Generated by CoffeeScript 1.10.0
(function() {
  var ac_list, account, acl, acl_backend, assert, bcrypt, log_mode, moment, options, seneca, seneca_entity, sinon, util;

  assert = require('chai').assert;

  bcrypt = require('bcryptjs');

  sinon = require('sinon');

  acl = require('acl');

  moment = require('moment');

  util = require('../util');

  acl_backend = new acl.memoryBackend();

  acl = new acl(acl_backend);

  seneca_entity = require('../node_modules/seneca/lib/entity').Entity.prototype;

  ac_list = [
    {
      roles: ['player'],
      allows: [
        {
          resources: 'profile',
          permissions: 'get'
        }
      ]
    }
  ];

  options = {
    test: true,
    token_secret: 'secret',
    jwtNoTimestamp: true,
    acl: acl,
    starter_role: 'player'
  };

  log_mode = process.env.TEST_LOG_MODE || 'quiet';

  seneca = require('seneca')({
    log: log_mode
  }).use('../plugin', options).client();

  account = seneca.pin({
    role: 'account',
    cmd: '*'
  });

  describe('register', function() {
    it('registers new account and assert no password in response', function(done) {
      return account.register({
        email: 'good@email.com',
        password: 'pass'
      }, function(error, new_account) {
        assert.equal(new_account.id, 'good@email.com');
        assert.isNull(error);
        assert.isUndefined(new_account.password);
        assert.equal(new_account.registered_at, moment().format());
        return acl.userRoles(new_account.id, function(error, roles) {
          assert.include(roles, 'player');
          return done();
        });
      });
    });
    it('silently fails if email is bad', function(done) {
      return account.register({
        email: 'bad_email.com',
        password: 'pass'
      }, function(error, new_account) {
        assert.isNull(new_account);
        assert.isNull(error);
        return done();
      });
    });
    it('silently fails when player is already registered', function(done) {
      return account.register({
        email: 'already@there.com'
      }, function(error, new_account) {
        if (new_account) {
          return account.register({
            email: 'already@there.com',
            password: 'pass'
          }, function(error, new_account) {
            assert.isNull(new_account);
            assert.isNull(error);
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
    it('fails if there is a salt generation error', function(done) {
      var stub;
      stub = sinon.stub(bcrypt, 'genSalt', function(length, callback) {
        return callback(new Error('bcrypt salt generation error'));
      });
      return account.register({
        email: 'good1@email.com',
        password: 'pass'
      }, function(error, new_user) {
        stub.restore();
        assert.isNull(new_user);
        assert.equal(error.message, 'seneca: Action cmd:register,role:account failed: bcrypt salt generation error.');
        return done();
      });
    });
    it('fails if there is a hash generation error', function(done) {
      var stub;
      stub = sinon.stub(bcrypt, 'hash', function(password, salt, callback) {
        return callback(new Error('bcrypt hash generation error'));
      });
      return account.register({
        email: 'good2@email.com',
        password: 'pass'
      }, function(error, new_user) {
        stub.restore();
        assert.isNull(new_user);
        assert.equal(error.message, 'seneca: Action cmd:register,role:account failed: bcrypt hash generation error.');
        return done();
      });
    });
    it('fails if there is a storage error', function(done) {
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
    return it('fails if there is an acl error', function(done) {
      var stub;
      stub = sinon.stub(acl, 'addUserRoles', function(id, roles, callback) {
        return callback(new Error('acl error while adding roles'));
      });
      return account.register({
        email: 'good3@email.com',
        password: 'pass'
      }, function(error, new_user) {
        stub.restore();
        assert.isNull(new_user);
        assert.equal(error.message, 'seneca: Action cmd:register,role:account failed: acl error while adding roles.');
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
        account_id: email,
        password: 'somepassword'
      }, function(error, result) {
        assert.isTrue(result.authenticated);
        return done();
      });
    });
    it('returns false if password is bad', function(done) {
      return account.authenticate({
        account_id: email,
        password: 'bad'
      }, function(error, result) {
        assert.isFalse(result.authenticated);
        return done();
      });
    });
    it('returns false if password is not sent', function(done) {
      return account.authenticate({
        account_id: email
      }, function(error, result) {
        assert.isFalse(result.authenticated);
        return done();
      });
    });
    it('returns false if account is unidentified', function(done) {
      return account.authenticate({
        account_id: 'doesntexist',
        password: 'doesntmatter'
      }, function(error, result) {
        assert.isFalse(result.identified);
        assert.isFalse(result.authenticated);
        return done();
      });
    });
    return it('returns false if password sent is a float', function(done) {
      return account.authenticate({
        account_id: email,
        password: 20.00
      }, function(error, result) {
        assert.isFalse(result.authenticated);
        return done();
      });
    });
  });

  describe('identify', function() {
    var email, hash;
    hash = null;
    email = 'another@kid.com';
    before(function(done) {
      return account.register({
        email: email,
        password: 'somepassword'
      }, function(error, res) {
        hash = res.password_hash;
        return done();
      });
    });
    it('returns account info if there is one', function(done) {
      return account.identify({
        account_id: email
      }, function(error, acc) {
        assert.equal(email, acc.id);
        assert.equal(hash, acc.password_hash);
        return done();
      });
    });
    it('returns null if there is no account', function(done) {
      return account.identify({
        account_id: 'no@account.com'
      }, function(error, res) {
        assert.equal(null, res);
        return done();
      });
    });
    return it('returns null if there was an error while loading record', function(done) {
      var stub;
      stub = sinon.stub(seneca_entity, 'load$', function(id, callback) {
        var error;
        error = new Error('entity load error');
        return callback(error);
      });
      return account.identify({
        account_id: email
      }, function(error, res) {
        assert.isNull(res);
        stub.restore();
        return done();
      });
    });
  });

  describe('login', function() {
    var issued_token;
    issued_token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.' + 'eyJpZCI6ImxvZ2dlZEBpbi5jb20ifQ.' + 'BA59h_3VC84ocimYdg72auuEFd1vo8iZlJ8notcVrxs';
    it('logs in a user', function(done) {
      return account.login({
        account_id: 'logged@in.com'
      }, function(error, res) {
        assert.equal(issued_token, res.token);
        return done();
      });
    });
    return it('returns same token if a user already logged in', function(done) {
      return account.login({
        account_id: 'logged@in.com'
      }, function(error, res) {
        return account.login({
          account_id: 'logged@in.com'
        }, function(error, res) {
          assert.equal(res.token, issued_token);
          return done();
        });
      });
    });
  });

  describe('authorize', function() {
    var token;
    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 'eyJpZCI6ImF1dGhvcml6ZWRAcGxheWVyLmNvbSJ9.' + 'WqzumznnQjadtYNUt_QYlbKEarmGT6I8Hvhre53UORU';
    before(function(before_done) {
      return acl.allow(ac_list, function(error) {
        if (error) {
          return seneca.log.error('acl load failed: ', error);
        } else {
          return account.register({
            email: 'authorized@player.com',
            password: 'authpass'
          }, function(error, res) {
            return before_done();
          });
        }
      });
    });
    it('allows a registered player to view his profile', function(done) {
      return account.authorize({
        token: token,
        resource: 'profile',
        action: 'get'
      }, function(error, res) {
        assert.isTrue(res.authorized);
        assert.isTrue(res.token_verified);
        assert.equal(res.account_id, 'authorized@player.com');
        return done();
      });
    });
    it('does not allow a registered player to delete his profile', function(done) {
      return account.authorize({
        token: token,
        resource: 'profile',
        action: 'delete'
      }, function(error, res) {
        assert.isFalse(res.authorized);
        assert.equal(res.account_id, 'authorized@player.com');
        return done();
      });
    });
    it('does not authorize with a bad token', function(done) {
      return account.authorize({
        token: 'bad.token'
      }, function(error, res) {
        assert.isFalse(res.token_verified);
        assert.isFalse(res.authorized);
        return done();
      });
    });
    it('does not authorize with a verified token of unknown account', function(done) {
      return account.authorize({
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 'eyJpZCI6InVua25vd25Aa2lkLmNvbSJ9.' + 'gLjI4tqAbmxS5xItMo2IuX2-3XxK0DHCR8q-SuiCkwk'
      }, function(error, res) {
        assert.isTrue(res.token_verified);
        assert.isFalse(res.authorized);
        return done();
      });
    });
    it('does not authorize with a verified token that has no id field', function(done) {
      return account.authorize({
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 'eyJpZGUiOiJ3cm9uZ0BwbGF5ZXIuY29tIn0.' + 'DtlP8pMWiwbamLv1VMgCXvKFb0t0vF6jnNRsVBChWnI'
      }, function(error, res) {
        assert.isTrue(res.token_verified);
        assert.isFalse(res.authorized);
        return done();
      });
    });
    it('does not authorize with a verified token if there is an acl error', function(done) {
      sinon.stub(acl, 'isAllowed', function(account_id, resource, action, callback) {
        var error;
        error = new Error('an acl error');
        return callback(error);
      });
      return account.authorize({
        token: token,
        resource: 'profile',
        action: 'get'
      }, function(error, res) {
        assert.isTrue(res.token_verified);
        assert.isFalse(res.authorized);
        sinon.restore();
        return done();
      });
    });
    return it('denies an anonymous user to view profile', function(done) {
      return account.authorize({
        token: null,
        resource: 'profile',
        permission: 'view'
      }, function(error, res) {
        assert.isFalse(res.authorized);
        return done();
      });
    });
  });

  describe('delete', function() {
    ({
      before: function(done) {
        return account.register({
          email: 'victim@player.com',
          password: 'authpass'
        }, function(error, res) {
          return account.identify({
            account_id: 'victim@player.com'
          }, function(error, res) {
            assert.equal(res.id, 'victim@player.com');
            return done();
          });
        });
      }
    });
    it('deletes a registered account and makes sure it is not present any more', function(done) {
      return account["delete"]({
        account_id: 'victim@player.com'
      }, function(error, res) {
        assert.isNull(error);
        assert.isNull(res);
        return account.identify({
          account_id: 'victim@player.com'
        }, function(error, res) {
          assert.isNull(res);
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
        account_id: 'victim@player.com'
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
      required = ['required'];
      options = {
        non_required: 'some_value'
      };
      assert.throws(function() {
        return util.check_options(options, required);
      }, 'required option required not defined');
      return done();
    });
    return it('does not throw errors if all required options are present', function(done) {
      var required;
      required = ['required_one', 'required_two'];
      options = {
        required_one: 1,
        required_two: 2
      };
      assert.doesNotThrow(function() {
        return util.check_options(options, required);
      });
      return done();
    });
  });

}).call(this);

//# sourceMappingURL=account.test.js.map
