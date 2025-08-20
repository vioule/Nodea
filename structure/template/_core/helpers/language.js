const { supportedLangs, overloadKey } = require('@config/languages');

const languages = {};
const overloads = {};

function loadAllLanguages() {
	const overload_trad = overloadKey ? overloadKey + "/" : "";

	for (const lang of supportedLangs) {
		try {
			languages[lang] = require('@app/locales/' + lang);
		} catch {
			languages[lang] = {};
		}

		if (overload_trad) {
			try {
				overloads[lang] = require('@app/locales/' + overload_trad + lang);
			} catch {
				overloads[lang] = {};
			}
		} else {
			overloads[lang] = {};
		}
	}
}

function getValue(obj, path) {
	return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function formatMessage(template, params = []) {
	let i = 0;
	return template.replace(/%s/g, () => params[i++] ?? '');
}

function fetchText(key, params = [], lang) {
	if (!key) return "";

	const value = getValue(overloads[lang], key) || getValue(languages[lang], key);
	if (typeof value !== 'string') return key;

	return formatMessage(value, params);
}

const smallWords = [
	"de", "du", "des", "le", "la", "les", "un", "une", "et",
	"à", "au", "aux", "en", "dans", "par", "sur", "avec",
	"mais", "ou", "ni", "car", "que"
];
function capitalizeFirstLetters(key, params, lang) {
	const msg = fetchText(key, params, lang);

	return msg
		.split(" ")
		.map((word, index) => {
			if (!word) return word;

			const lowerWord = word.toLowerCase();

			// Si ce mot est dans les "petits mots" ET que ce n'est pas le premier mot
			if (index > 0 && smallWords.includes(lowerWord.replace(/['’]/, ""))) {
				return lowerWord; // reste en minuscule
			}

			// Gestion apostrophe (d'information -> D'Information)
			if (word.includes("'") || word.includes("’")) {
				const [before, after] = word.split(/['’]/, 2);
				if (after && after.length > 0) {
					return before + "'" + after.charAt(0).toUpperCase() + after.slice(1);
				}
			}

			// Cas standard
			return word.charAt(0).toUpperCase() + word.slice(1);
		})
		.join(" ");
}

// Charger toutes les langues immédiatement
loadAllLanguages();

module.exports = (lang) => {return {
	__: (key, params) => fetchText(key, params, lang),
	M_: (key, params) => capitalizeFirstLetters(key, params, lang),
	getLang: () => lang
}};
