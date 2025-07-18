// Set UTC
process.env.TZ = 'UTC';

// See _moduleAliases in package.json
require('module-alias/register');
global.__configPath = __dirname + '/config';
global.__corePath = __dirname + '/_core';
global.__appPath = __dirname + '/app';

// Autologin for Nodea's "iframe" live preview context
global.auto_login = false;
if (process.argv[2] == 'autologin')
	global.auto_login = true;

require('@core/utils/string_prototype');

const https = require('https');
const http = require('http');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const flash = require('connect-flash');
const socketSession = require('express-socket.io-session');
const express = require('express');
const xss = require('xss');
const app = express();

// Désactive cette en-tête ajouter par defaut par Express.js
app.disable('x-powered-by');

const globalConf = require('@config/global');
const access = require('@core/helpers/access');
const language = require('@core/helpers/language');

// Securing HTTP headers
const helmet = require('helmet'); // https://helmetjs.github.io/
const helmet_conf = require('@config/helmet');
app.use(helmet(helmet_conf));

// Set up public files access (js/css...)
app.use(express.static(__appPath + '/public'));
app.use('/core', express.static(__corePath + '/public'));

// JSDOC access
app.use('/docs_core', express.static(__dirname + '/docs_core'));
app.use('/docs_app', express.static(__dirname + '/docs_app'));

// Public files bundler
const bundler = require('@core/tools/bundler');

// Server logs manager
app.use(require('@core/server/logs'));

// Pass passport for configuration
require('@app/services/authentication');

// Read cookies (needed for auth)
app.use(cookieParser());
app.use(bodyParser.urlencoded({
	extended: true,
	limit: '50mb',
	parameterLimit: 1000000
}));
app.use(bodyParser.json());

//------------------------------ DUST.JS ------------------------------ //
const dust = require('dustjs-linkedin');
dust.debugLevel = "WARN";

const cons = require('@core/library/consolidate');

const dustFn = require("@core/utils/dust"); // eslint-disable-line
// To use before calling renderSource function
// Insert locals function in dustData
dust.insertLocalsFn = (locals, request) => {
	dustFn.helpers(dust);
	dustFn.locals(locals, request, language(request.session.lang_user), access);
	dustFn.filters(dust, request.session.lang_user);
}

app.engine('dust', cons.dust);
app.set('view engine', 'dust');
app.set('views', [__appPath + '/views', __corePath + '/views']);

// Session
const sessionInstance = require('@core/server/session');
app.use(sessionInstance);

// Persistent login sessions
app.use(passport.initialize());
app.use(passport.session());

// TODO: Remove the use of flash
// Use connect-flash for flash messages stored in session
app.use(flash());

// Fonction de nettoyage XSS
function sanitizeBody(body) {
	if (typeof body === 'string') {
		return xss(body);
	} else if (Array.isArray(body)) {
		return body.map(sanitizeBody);
	} else if (typeof body === 'object' && body !== null) {
		const sanitizedObject = {};
		for (const key in body) {
			if (body.hasOwnProperty(key)) {
				sanitizedObject[key] = sanitizeBody(body[key]);
			}
		}
		return sanitizedObject;
	}
	return body;
}

// Middleware prevent XSS injection except for media_mail content
// If you need to store HTML content, please add excluded_url here
app.use((req, res, next) => {

	const excluded_url = [
		"/media_mail/update",
		"/media_mail/create"
	];

	if(!excluded_url.includes(req.url)) {
		if (req.body) {
			req.body = sanitizeBody(req.body);
		}
		if (req.query) {
			req.query = sanitizeBody(req.query);
		}
		if (req.params) {
			req.params = sanitizeBody(req.params);
		}
	}

	next();
});

// For Nodea use ======================================================================
// When application process is a child of generator process, log each routes for the generator
// to keep track of it, and redirect after server restart
if (global.auto_login) {
	app.get('/*', (req, res, next) => {
		const url = req.originalUrl;
		if (url.indexOf("/inline_help/") != -1 || url.indexOf('/loadtab/') != -1 || req.query.ajax)
			return next();
		if (url.indexOf('/show') == -1 && url.indexOf('/list') == -1 && url.indexOf('/create') == -1 && url.indexOf('/update') == -1 && url.indexOf('/module/home') == -1)
			return next();
		console.log("IFRAME_URL::"+url);
		next();
	});
}

// Routes ======================================================================
app.use(require('@core/server/routing')(dust, dustFn));
app.use(require('@core/server/render')(dust));
app.use(require('@core/server/redirect'));

// App routes
require('@app/routes/')(app);

// Api routes ==================================================================
const apiLoader = require('@app/api');
apiLoader.routes(app);

// Handle 404
app.use((req, res) => {
	res.status(404);
	res.render('common/404');
});

// Launch ======================================================================

require('@core/server/database').then(async _ => {

	let server, io = false;

	// Prepare server
	if (globalConf.protocol == 'https')
		server = https.createServer(globalConf.ssl, app);
	else
		server = http.createServer(app);

	// Socket io
	if (globalConf.socket.enabled) {
		io = require('socket.io')(server); // eslint-disable-line
		// Provide shared express session to sockets
		io.use(socketSession(sessionInstance));
		require('@core/services/socket')(io); // eslint-disable-line
	}

	// Handle and prepare access.json file for various situation
	access.accessFileManagment();

	// Generate missing public ressources bundle
	await bundler.bundleAll(true);

	// Start server on port
	server.listen(globalConf.port);

	console.log("✅ Started " + globalConf.protocol + " on " + globalConf.port + " !");
}).catch(err => {
	console.error(err);
})

module.exports = app;