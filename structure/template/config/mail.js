const globalConf = require('./global');

const mailConf = {
	develop: {
		transport: {
			host: 'mail',
			port: 465,
			secure: true,
			auth: {
				user: '',
				pass: ''
			}
		},
		from: 'Nodea App <no-reply@nodea-software.com>',
		url : {
			host: 'http://127.0.0.1:' + globalConf.port
		}
	},
	test: {
		transport: {
			host: 'mail',
			port: 465,
			secure: true,
			auth: {
				user: '',
				pass: ''
			}
		},
		from: 'Nodea App <no-reply@nodea-software.com>',
		url : {
			host: 'http://127.0.0.1:' + globalConf.port
		}
	},
	production: {
		transport: {
			host: 'mail',
			port: 465,
			secure: true,
			auth: {
				user: '',
				pass: ''
			}
		},
		from: 'Nodea App <no-reply@nodea-software.com>',
		url : {
			host: 'http://127.0.0.1:' + globalConf.port
		}
	},
	studio: {
		transport: {
			host: 'mail',
			port: 465,
			secure: true,
			auth: {
				user: '',
				pass: ''
			}
		},
		from: 'Nodea App <no-reply@nodea-software.com>',
		url : {
			host: 'http://127.0.0.1:' + globalConf.port
		}
	},
	cloud: {
		transport: {
			host: 'mail',
			port: 465,
			secure: true,
			auth: {
				user: '',
				pass: ''
			}
		},
		from: 'Nodea App <no-reply@nodea-software.com>',
		url : {
			host: 'http://127.0.0.1:' + globalConf.port
		}
	}
}

module.exports = mailConf[globalConf.env];