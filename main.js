'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs-extra');
const commander = require('commander');

const Uploader = require('./uploader');

const logger = require('./logger');

process
	.on('unhandledRejection', (reason, p) => {
		//console.error(reason, 'Unhandled Rejection at Promise', p);
		console.error('Unhandled rejection : ' + reason.message);
		if (reason.error && reason.error.stack) {
			console.error(reason.error.stack);
		}
		process.exit(100);
	})
	.on('uncaughtException', err => {
		console.error('Uncaught exception thrown : ' + err.message);
		console.error(err.stack);
		process.exit(200);
	});


async function runScript(albumsFolder) {
	try {
		let stat = await fs.stat(albumsFolder);

		if (!stat.isDirectory()) {
			logger.error(`The argument must be a path to a valid folder. ${albumsFolder} is a regular file.`);
			process.exit(1);
		}
	} catch(err) {
		logger.error(`The argument must be a path to a valid folder. ${err.message}`);
		process.exit(1);
	}

	let uploader = new Uploader(albumsFolder, commander.firstFolder, commander.skipExifFix);
	await uploader.run();
}

let albumsFolder;

commander
	.version('0.1.0')
	.usage('[options] <albumsFolder>')
	.option('-s, --skip-exif-fix', 'Skips the exif data verification and fix in the case where the photo does not have a creation date')
	.option('-f, --first-folder [startFolder]', 'Folder to use as the start folder (instead of the first one alphabetically). Useful when there is only a partial upload done')
	.arguments('<albumsFolder>')
	.action((_albumsFolder) => {
		albumsFolder = _albumsFolder;
	})
	.parse(process.argv);


runScript(albumsFolder);

