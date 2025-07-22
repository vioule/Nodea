const ApiRoute = require('@core/abstract_routes/api_route');

const apiRootValidators = require('@core/validators/apiRootValidators.js');
const crypto = require('@core/utils/crypto.js');
const { KEY_TK } = require('@config/key_env.json');
const { jwt_options } = require('@config/global.js');
const jwt = require('jsonwebtoken');


class CoreApiRoot extends ApiRoute {
	constructor(additionalRoutes) {
		const routes = [
			'getToken',
			...additionalRoutes
		]
		super(routes);
	}

	getToken() {
		this.router.get('/getToken', apiRootValidators.basicAuthControl, this.asyncRoute(async (data) => {
			try {
				data.res.success((_) => data.res.status(200).json({
					token: jwt.sign(
						{
							data: crypto.encryptObject({
								name: data.req.apiCredentials.f_client_name,
								clientId: data.req.apiCredentials.f_client_key,
								secretId: data.req.apiCredentials.f_client_secret,
							})
						},
						KEY_TK,
						{
							expiresIn: jwt_options.nodea_temp
						}
					)
				}));
			} catch (err) {
				console.log(err);
				data.res.error((_) => data.res.status(500).json(err));
			}
		}));
	}
}

module.exports = CoreApiRoot;