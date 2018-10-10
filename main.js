'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const Client = require('./lib/client');

let albumsFolder = process.argv[2];

const logger = require('./logger');

process
	.on('unhandledRejection', (reason, p) => {
		console.error(reason, 'Unhandled Rejection at Promise', p);
		process.exit(3);
	})
	.on('uncaughtException', err => {
		console.error(err, 'Uncaught Exception thrown');
		process.exit(4);
	});

async function runScript() {
	try {
		let stat = await fs.stat(albumsFolder);

		if (!stat.isDirectory()) {
			logger.error(`The argument must be a path to a valid folder. ${albumsFolder} is a regular file.`);
			process.exit(1);
			return;
		}
	} catch (err) {
		logger.error(`The argument must be a path to a valid folder. ${err.message}`);
		process.exit(1);
		return;
	}

	let client = new Client();
	await client.connect();

	let folderContentNames = await fs.readdir(albumsFolder);

	logger.info(`There is a total of ${folderContentNames.length} items to process in the specified folder.`);

	_.each(folderContentNames, (folderContentName, index) => {
		let folderItemPath = path.join(albumsFolder, folderContentName);

		let stats = await fs.stat(folderItemPath);

		// If random photos are found inside the target folder, simply upload them in no particular album.
		if (!stats.isDirectory()) {
			await client.uploadPhoto(folderItemPath);
			continue;
		}

		let albumID = await client.createAlbum(itemName);

		const albumContent = await fs.readdir(folderItemPath);

		_.each(albumContent, (photoFilename) => {
			let photoPath = path.join(folderItemPath, photoFilename);
			await client.uploadPhoto(photoPath, albumID);
		});

		logger.info(`Album "${folderContentName}" completed. Progress is : ${index + 1}/${folderContentNames.length}`);
	});
}

runScript().catch(console.error);

