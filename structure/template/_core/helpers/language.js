const languages = [];

function deepFindObject(obj, key) {
	if(typeof obj === 'undefined') {
		return undefined;
	}
	const parts = key.split(".");
	if (parts.length == 1){
		return obj[parts[0]];
	}
	return deepFindObject(obj[parts[0]], parts.slice(1).join("."));
}

function fetchText(key, params, lang) {
	if (!key)
		return "";
	let keys;
	try {
		keys = key.split('.');
	} catch (e) {
		return key;
	}

	if (typeof languages[lang] === 'undefined') {
		try {
			delete require.cache[require.resolve('@app/locales/' + lang)];
			languages[lang] = require('@app/locales/' + lang); // eslint-disable-line
		} catch (e) {
			console.log(e);
			return key;
		}
	}

	// eslint-disable-next-line global-require
	const overloadDepth = require('@app/locales/overload/' + lang);

	let depth = languages[lang];
	for (let i = 0; i < keys.length; i++) {

		depth = deepFindObject(overloadDepth, key) || depth[keys[i]];

		if (typeof depth === 'undefined')
			return key;
	}

	if(typeof depth !== 'string')
		return key;

	const nbParamsFound = (depth.match(/%s/g) || []).length;
	if (nbParamsFound > 0 && nbParamsFound == params.length) {
		for (let j = 0; j < nbParamsFound; j++) {
			depth = depth.replace("%s", params[j]);
		}
	}

	return depth;
}

function capitalizeFirstLetters(key, params, lang) {
	const msg = fetchText(key, params, lang);
	const words = msg.split(' ');
	let res = '';
	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		const wordParts = word.split('\'');
		if (wordParts.length > 1)
		// d'information -> d'Information
			res += wordParts[0] + '\'' + wordParts[1].charAt(0).toUpperCase() + word.slice(3);
		else
		// information -> Information
			res += word.charAt(0).toUpperCase() + word.slice(1);
		if (i < words.length)
			res += ' ';
	}
	return res != '' ? res : key;
}

module.exports = (lang) => {
	return {
		__: function (key, params) {
			return fetchText(key, params, lang);
		},
		M_: function(key, params) {
			return capitalizeFirstLetters(key, params, lang);
		},
		getLang: function(){
			return lang;
		}
	}
}