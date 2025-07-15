/* eslint-disable indent */
const models = require('@app/models/');

exports.basicAuthControl = async(req, res, next) => {
    let msg = "Une erreur c'est produite.";

    try {
        const { authorization } = req.headers;
        if(!authorization) {
            msg = 'Missing authorization headers';
            throw 'MISSING AUTHORIZATION HEADERS';
        }

        const parts = authorization.split(' ');
        if(parts.length != 2) {
            msg = 'Invalid authorization format';
            throw 'INVALID AUTHORIZATION FORMAT';
        }

        if(parts[0] != 'Basic') {
            msg = 'Wrong authorization';
            throw 'AUTHORIZATION MUST BE "Basic"';
        }

        const credentials = Buffer.from(parts[1], 'base64').toString().split(':');

        if(!credentials[0] || !credentials[1]) {
            msg = 'Missing clientk ey or client secret or both';
            throw 'MISSING CLIENT KEY OR CLIENT SECRET OR BOTH';
        }

        const api_credentials = await models.E_api_credentials.findOne({
            where: {
                f_client_key: credentials[0],
                f_client_secret: credentials[1],
            }
        });

        if(!api_credentials) {
            msg = 'Wrong client kay or client secret or both';
            throw 'WRONG CLIENT KEY OR CLIENT SECRET OR BOTH';
        }

        req.apiCredentials = api_credentials;

        next()
    } catch (err) {
        console.error(err);
        res.status(400).json({msg});
    }
}