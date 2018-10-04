'use strict';

require('dotenv').config();
const util = require('util');
const path = require('path');
const fs = require('fs-extra');
const _ = require('underscore');
const winston = require('winston');
const request = require('request-promise');

const oauth = require('./oauth');

const googlePhotoAPIBasePath = 'https://photoslibrary.googleapis.com';
const googlePhotoAPIAuthScopes = ['https://www.googleapis.com/auth/photoslibrary.appendonly'];


let albumsFolder = process.argv[2];


const logger = winston.createLogger({
	level : 'info',
	format : winston.format.combine(
		winston.format.timestamp({
			format : 'YYYY-MM-DD HH:mm:ss'
		}),
		winston.format.printf(info => `${info.timestamp} [${info.level}] ${info.message}`)
	),
	transports : [
		new winston.transports.File({filename : 'googlePhotoAlbumUploader.log'}),
		new winston.transports.Console()
	]
});


let uploadPhoto = async function(accessToken, filePath, albumID) {
	let fileContent = await fs.readFile(filePath);

	let uploadToken = await request.post(googlePhotoAPIBasePath + '/v1/uploads', {
		headers : {
			'Content-Type' : 'application/octet-stream',
			'X-Goog-Upload-File-Name' : path.basename(filePath),
			'X-Goog-Upload-Protocol' : 'raw'
		},
		auth : {'bearer' : accessToken},
		body : fileContent
	});

	let postBody = {
		newMediaItems : [
			{
				simpleMediaItem : {
					uploadToken : uploadToken
				}
			}
		]
	};
	if (albumID) {
		postBody.albumId = albumID;
	}

	let res = await request.post(googlePhotoAPIBasePath + '/v1/mediaItems:batchCreate', {
		headers : {'Content-Type' : 'application/json'},
		json : true,
		auth : {'bearer' : accessToken},
		body : postBody
	});

	// TODO : Validate that the file was correctly uploaded?

	logger.info(`File "${path.basename(filePath)}" was uploaded successfully.`);
};

async function runScript() {
	let stat = await fs.stat(albumsFolder);

	if (!stat.isDirectory()) {
		logger.error('The argument must be a path to a valid folder.');
		process.exit(1);
	}

	let client = await oauth(googlePhotoAPIAuthScopes);
	let accessToken = client.credentials.access_token;

	let folderContentNames = await fs.readdir(albumsFolder);

	logger.info(`There is a total of ${folderContentNames.length} items to process in the specified folder.`);

	for (let i = 0; i < folderContentNames.length; i++) {
		let itemName = folderContentNames[i];
		let folderItemPath = path.join(albumsFolder, itemName);

		let stats = await fs.stat(folderItemPath);

		if (!stats.isDirectory()) {
			await uploadPhoto(accessToken, folderItemPath);
			continue;
		}

		let res = await request.post(googlePhotoAPIBasePath + '/v1/albums', {
			headers : {'Content-Type' : 'application/json'},
			json : true,
			auth : {'bearer' : accessToken},
			body : {
				"album" : {"title" : itemName}
			}
		});

		logger.info(`Created the album "${itemName}".`);

		let albumID = res.id;

		const albumContent = await fs.readdir(folderItemPath);

		for (let i = 0; i < albumContent.length; i++) {
			let photoFilename = albumContent[i];
			let photoPath = path.join(folderItemPath, photoFilename);
			await uploadPhoto(accessToken, photoPath, albumID);
		}

		logger.info(`Album "${itemName}" completed. Progress is : ${i + 1}/${folderContentNames.length}`);
	}
}

runScript().catch(console.error);

