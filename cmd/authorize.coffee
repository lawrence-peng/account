jwt = require 'jsonwebtoken'

module.exports = (seneca, options) ->

    acl = options.acl

    cmd_authorize = (params, respond) ->
        resource = params.resource
        action = params.action
        token = params.token
        secret = options.token_secret
        response =
            token_verified: false
            authorized: false

        # verify and read token payload
        jwt.verify token, secret, (error, decoded) ->
            if error
                seneca.log.debug 'token verification error', error.message
                return respond null, response

            seneca.log.debug 'token verified'
            response.token_verified = true
            account_id = decoded.id

            if !account_id
                seneca.log.error 'failed to decode id'
                return respond null, response

            # re-identify the user to check his permissions and current status
            seneca.act 'role:account,cmd:identify', {email: account_id}, (error, account) ->
                if account
                    response.identified_by = account_id
                    seneca.log.debug 'account identified', account_id
                    seneca.log.debug 'checking access', account_id, resource, action

                    acl.addUserRoles account_id, [account.role], (error) ->
                        if error
                            seneca.log.error 'adding role to account failed:', error.message
                            return respond error, null

                        acl.isAllowed account_id, resource, action, (error, res) ->
                            if error
                                seneca.log.error 'access check failed', error
                                respond null, response
                            else
                                response.authorized = res
                                respond null, response
                else
                    seneca.log.debug 'authorization failed, unidentified account', account_id
                    respond null, response

    cmd_authorize
