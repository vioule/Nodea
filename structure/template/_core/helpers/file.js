const globalConf = require('@config/global');
const appConf = require('@config/application');
const dayjs = require('dayjs');
const uuidV4 = require('uuid').v4;
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');


function securePath(...paths) {
	const securedPaths = [];
	let securedPath = "";
	// Remove null bytes
	for (const path of paths)
		if (path && path.replace)
			securedPaths.push(path.replace('\0', ''));
	if (!securedPaths.length)
		throw new Error("No path provided");
	// Resolve to full path
	securedPath = path.resolve(...securedPaths);
	// Check that path is inside globalConf.localestorage
	if (securedPath.indexOf(path.resolve(globalConf.localstorage)) != 0)
		throw new Error("Illegal file path : "+securedPath);

	return securedPath;
}

function createPathAndName(baseFolder, filename) {
	if (!filename || filename == "")
		throw new Error("No filename provided to createPath");

	const uuid = uuidV4();
	const date = dayjs();
	const year = date.year(), month = date.month(), day = date.date();

	filename = Buffer.from(filename, 'latin1').toString('utf8').replace(/\s/g, '_');
	const newFilename = `${uuid}-${filename}`;
	const filePath = `${baseFolder}/${year}/${month}/${day}/`;
	return [filePath, newFilename];
}

function originalFilename(filePath) {
	try {
		const fileInfo = path.parse(filePath);
		const filename = fileInfo.base;
		const originalName = filename.substr(37); // 36 to remove uuid, +1 to remove separating '-'

		return originalName;
	} catch(err) {
		console.error("Couldn't extract originalFilename of "+filePath);
		console.error(err);
		return "No name";
	}
}

function write(filePath, buffer, encoding = 'utf8') {
	return new Promise((resolve, reject) => {
		let securedPath, folderPath;
		try {
			securedPath = securePath(globalConf.localstorage, filePath);
			folderPath = path.parse(securedPath).dir;
			fs.ensureDirSync(folderPath);
		} catch(err) {
			return reject(err);
		}
		fs.writeFile(securedPath, buffer, {encoding}, err => {
			if (err) return reject(err);
			resolve();
		});
	});
}

// Fonction qui sert pour la fonction writePicture
async function writeFileWithDirs(filePath, buffer, encoding) {
	const securedPath = securePath(globalConf.localstorage, filePath);
	const folderPath = path.parse(securedPath).dir;
	await fs.ensureDir(folderPath);
	return fs.writeFile(securedPath, buffer, encoding === 'utf8' ? undefined : encoding);
}

// Fonction permettant de retailler l'image et de calculer une vignette le cas échéant
async function writePicture(filePath, buffer, encoding = 'utf8') {
	const ext = path.extname(filePath).toLowerCase();
	const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

	if (!supportedFormats.includes(ext)) {
		throw new Error(`Format non supporté: ${ext}`);
	}

	const format = ext.slice(1); // exemple: '.jpg' → 'jpg'
	const promises = [];

	// Resize principale (optionnel)
	if (ext !== '.svg' && appConf.resizePicture?.enabled) {
		const { width, height, quality } = appConf.resizePicture;

		const resizedBuffer = await sharp(buffer)
			.resize(width, height)
			.toFormat(format, { quality })
			.toBuffer();

		promises.push(writeFileWithDirs(filePath, resizedBuffer, encoding));
	} else {
		// Écrit le buffer original sans resize
		promises.push(writeFileWithDirs(filePath, buffer, encoding));
	}

	// Thumbnail
	const { width: tWidth, height: tHeight, quality: tQuality, folder } = appConf.thumbnail;
	const thumbPath = path.join(folder, filePath);

	if (ext !== '.svg') {
		const thumbBuffer = await sharp(buffer)
			.resize(tWidth, tHeight)
			.toFormat(format, { quality: tQuality })
			.toBuffer();
		promises.push(writeFileWithDirs(thumbPath, thumbBuffer, encoding));
	} else {
		// Thumbnail pour du SVG non utile donc écriture du même contenu
		promises.push(writeFileWithDirs(thumbPath, buffer, encoding));
	}

	await Promise.all(promises);
}

function read(filePath, options = {}) {
	return new Promise((resolve, reject) => {
		let securedPath;
		try {
			securedPath = securePath(globalConf.localstorage, filePath);
		} catch(err) {
			return reject(err);
		}
		fs.readFile(securedPath, options, (err, data) => {
			if (err)
				return reject(err);
			resolve(data);
		});
	})
}

async function readBuffer(path, options = {}) {
	let fileData;
	try {
		fileData = await read(path, options);
	} catch(err) {
		console.error("Couldn't read buffer of "+path);
		return null;
	}

	const encoding = options.encoding || 'base64';
	return Buffer.from(fileData).toString(encoding);
}

function remove(filePath) {
	return new Promise((resolve, reject) => {
		let securedPath;
		try {
			securedPath = securePath(globalConf.localstorage, filePath);
		} catch(err) {
			return reject(err);
		}
		fs.unlink(securedPath, err => {
			if (err) return reject(err);
			resolve();
		});
	});
}

function removePicture(filePath) {
	return new Promise((resolve, reject) => {
		let securedPath, securedPathThumbnail;
		try {
			securedPath = securePath(globalConf.localstorage, filePath);
			securedPathThumbnail = securePath(globalConf.localstorage, appConf.thumbnail.folder, filePath);
		} catch(err) {
			return reject(err);
		}
		// Remove picture
		fs.unlink(securedPath, err => {
			if (err) return reject(err);
			// Remove thumbnail
			fs.unlink(securedPathThumbnail, err => {
				if (err) return reject(err);
				resolve();
			});
		});
	});
}

function fullPath(filePath) {
	const securedPath = securePath(globalConf.localstorage, filePath);
	return securedPath;
}

module.exports = {
	createPathAndName,
	originalFilename,
	write,
	writePicture,
	read,
	readBuffer,
	remove,
	removePicture,
	securePath,
	fullPath
}