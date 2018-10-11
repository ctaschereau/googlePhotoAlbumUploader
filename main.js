'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs-extra');
const Client = require('./lib/client');

const MIN_TIME_BETWEEN_UPLOADS = 3000;

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

let timeout = function(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
};

async function runScript() {
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

	let client = new Client();
	await client.connect();

	let folderContentNames = await fs.readdir(albumsFolder);

	logger.info(`There is a total of ${folderContentNames.length} items to process in the specified folder.`);

	for (let i = 0; i < folderContentNames.length; i++) {
		let itemName = folderContentNames[i];
		let folderItemPath = path.join(albumsFolder, itemName);

		let stats = await fs.stat(folderItemPath);

		// If random photos are found inside the target folder, simply upload them in no particular album.
		if (!stats.isDirectory()) {
			await client.fixExifDate(folderItemPath);

			// Simple throttling method to avoid quota busting using a free Google api key.
			await Promise.all([
				client.uploadPhoto(folderItemPath),
				timeout(MIN_TIME_BETWEEN_UPLOADS)
			]);
			continue;
		}

		let albumID = await client.createAlbum(itemName);

		const albumContent = await fs.readdir(folderItemPath);

		for (let i = 0; i < albumContent.length; i++) {
			let photoFilename = albumContent[i];
			let photoPath = path.join(folderItemPath, photoFilename);

			let stats = await fs.stat(photoPath);
			if (stats.isDirectory()) {
				logger.warn(`Deep folder structure here : ${photoPath} will be ignored.`);
				continue;
			}

			await client.fixExifDate(photoPath);

			// Simple throttling method to avoid quota busting using a free Google api key.
			await Promise.all([
				client.uploadPhoto(photoPath, albumID),
				timeout(MIN_TIME_BETWEEN_UPLOADS)
			]);
		}

		logger.info(`Album "${itemName}" completed. Progress is : ${i + 1}/${folderContentNames.length}`);
	}
}

runScript().catch(console.error);

