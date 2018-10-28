'use strict';

const _ = require('underscore');
const fs = require('fs-extra');
const request = require('request-promise');
const path = require('path');


const exifUtils = require('./lib/exifUtils');
const oauth = require('./oauth');
const config = require('./config');
const logger = require('./logger');


let _setPromiseTimeout = function(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
};


class Uploader {

	constructor(albumsFolder, startFolder, skipExifFix = false) {
		this.albumsFolder = albumsFolder;
		this.startFolder = startFolder;
		this.skipExifFix = skipExifFix;
		this.accessToken = undefined;
	}

	async run() {
		try {
			await this.connect();
		} catch (err) {
			logger.error(`Error while connecting to the Google api. Error was : ${err.message}`);
			process.exit(2);
		}

		let folderContentNames = await fs.readdir(this.albumsFolder);
		folderContentNames = folderContentNames.sort();

		logger.info(`There is a total of ${folderContentNames.length} items to process in the specified folder.`);

		if (this.startFolder && !_.contains(folderContentNames, this.startFolder)) {
			this.startFolder = null;
		}

		for (let i = 0; i < folderContentNames.length; i++) {
			let itemName = folderContentNames[i];
			let folderItemPath = path.join(this.albumsFolder, itemName);

			let stats = await fs.stat(folderItemPath);

			// If random photos are found inside the target folder, simply upload them in no particular album.
			if (!stats.isDirectory()) {
				try {
					await this.processOnePhoto(folderItemPath);
				} catch (err) {
					logger.error(`Error while processing photo : ${folderItemPath}. Error was : ${err.message}`);
					process.exit(4);
				}
				continue;
			}

			if (this.startFolder && itemName < this.startFolder) {
				logger.info(`Skipped album "${itemName}". Progress is : ${i + 1}/${folderContentNames.length}`);
				continue;
			}

			let albumID;
			try {
				albumID = await this.createAlbum(itemName);
			} catch (err) {
				logger.error(`Error while creating the photo album : ${itemName}. Error was : ${err.message}`);
				process.exit(3);
			}

			let albumContent = await fs.readdir(folderItemPath);
			albumContent = albumContent.sort();

			for (let i = 0; i < albumContent.length; i++) {
				let photoFilename = albumContent[i];
				let photoPath = path.join(folderItemPath, photoFilename);

				let stats = await fs.stat(photoPath);
				if (stats.isDirectory()) {
					logger.warn(`Deep folder structure ${photoPath} will be ignored.`);
					continue;
				}

				try {
					await this.processOnePhoto(photoPath, albumID);
				} catch (err) {
					logger.error(`Error while processing photo : ${photoPath}. Error was : ${err.message}`);
					process.exit(4);
				}
			}

			logger.info(`Album "${itemName}" completed. Progress is : ${i + 1}/${folderContentNames.length}`);
		}
	}

	async connect() {
		let client = await oauth(config.GOOGLE_PHOTO_API_AUTH_SCOPES);
		this.accessToken = client.credentials.access_token;
	}

	async createAlbum(albumName) {
		let res = await request.post(`${config.GOOGLE_PHOTO_API_BASE_PATH}/v1/albums`, {
			headers : {'Content-Type' : 'application/json'},
			json : true,
			auth : {bearer : this.accessToken},
			body : {
				album : {
					title : albumName
				}
			}
		});

		logger.info(`Created the album "${albumName}".`);

		return res.id;
	}

	/**
	 * @param {String} photoPath
	 * @param {String} [albumID]
	 * @returns {Promise<void>}
	 */
	async processOnePhoto(photoPath, albumID) {
		if (!this.skipExifFix) {
			try {
				await exifUtils.fixExifDate(photoPath);
			} catch (err) {
				logger.error(`An error occurred while fixing the exif data for file ${photoPath}. ${err.message}`, err.stack);
				return;
			}
		}

		// Simple throttling method to avoid quota busting using a free Google api key.
		await Promise.all([
			this.uploadPhoto(photoPath, albumID),
			_setPromiseTimeout(config.MIN_TIME_BETWEEN_UPLOADS)
		]);
	}

	async uploadPhoto(filePath, albumID) {
		let fileContent = await fs.readFile(filePath);

		let uploadToken = await request.post(`${config.GOOGLE_PHOTO_API_BASE_PATH}/v1/uploads`, {
			headers : {
				'Content-Type' : 'application/octet-stream',
				'X-Goog-Upload-File-Name' : path.basename(filePath),
				'X-Goog-Upload-Protocol' : 'raw'
			},
			auth : {bearer : this.accessToken},
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

		let res = await request.post(`${config.GOOGLE_PHOTO_API_BASE_PATH}/v1/mediaItems:batchCreate`, {
			headers : {'Content-Type' : 'application/json'},
			json : true,
			auth : {bearer : this.accessToken},
			body : postBody
		});

		// TODO : Check that res.newMediaItemResults["0"].status.message === 'OK'

		logger.info(`File "${path.basename(filePath)}" was uploaded successfully.`);
	};

}

module.exports = Uploader;