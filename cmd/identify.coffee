module.exports = (seneca, options) ->

    cmd_identify = (msg, respond) ->
        email = msg.email
        account_records = seneca.make 'account'
        account_records.list$ {email: email}, (error, accounts) ->
            if error
                seneca.log.error 'error while loading account', email, error.message
                seneca.act 'role:error,cmd:register',
                    from: 'account.identify.entity.load$',
                    message: error.message
                    args:
                        email: email
                respond null, null
            else
                respond null, accounts[0]

    cmd_identify
