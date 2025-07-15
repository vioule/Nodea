/* eslint-disable indent */
/* eslint-disable no-trailing-spaces */
const CryptoJS = require("crypto-js");
const { CRYPTO_KEY, CRYPTO_IV } = require("@config/key_env.json");

exports.encryptObject = (object) => {
    const data = JSON.stringify(object);
    return Buffer.from(CryptoJS.AES.encrypt(data, CRYPTO_KEY, { iv: CRYPTO_IV}).toString()).toString('Hex');
}

exports.decryptObject = (object) => {
    const buffer = Buffer.from(object, 'Hex').toString();
    const bytes = CryptoJS.AES.decrypt(buffer, CRYPTO_KEY, { iv: CRYPTO_IV});
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
}

exports.encryptString = (string) => CryptoJS.AES.encrypt(string, CRYPTO_KEY, { iv: CRYPTO_IV}).toString()

exports.decryptString = (string) => CryptoJS.AES.decrypt(string, CRYPTO_KEY, {iv: CRYPTO_IV}).toString(CryptoJS.enc.Utf8)