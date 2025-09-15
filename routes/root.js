const express = require('express');
const router = express.Router();

const middlewares = require('../helpers/middlewares');

router.get('/', middlewares.loginAccess, function(req, res) {
	res.redirect('/default/home');
});

// Waiting room for deploy instruction
router.get('/waiting', function(req, res) {
	res.render('front/waiting_deploy', {
		redirect: req.query.redirect
	});
});

router.post('/waiting', async function (req, res) {
	try {
		const response = await fetch(req.body.redirect, {
			method: 'GET',
			// Pour désactiver la vérification SSL (⚠️ à éviter en prod)
			agent: new (require('https').Agent)({ rejectUnauthorized: false })
		});

		if (response.status !== 200 && response.status !== 302) {
			return res.sendStatus(503);
		}

		return res.sendStatus(200);
	} catch (error) {
		console.error(error);
		return res.sendStatus(503);
	}
});

router.get('/error/:code', function(req, res) {
	res.render('common/error', {
		code: req.params.code
	});
});

module.exports = router;