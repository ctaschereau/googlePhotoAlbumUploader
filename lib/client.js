'use strict';
const fs = require('fs-extra');
const request = require('request-promise');
const path = require('path');

const exiftool = require('node-exiftool');
const exiftoolBin = require('dist-exiftool');
const ep = new exiftool.ExiftoolProcess(exiftoolBin);

const oauth = require('../oauth');
const config = require('../config');
const logger = require('../logger');

class Client {
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
	 * In case the file does not have an EXIF date, assign one using the file's modification time.
	 * In the case where the filepath does not indicate a file with EXIF data, nothing will be done.
	 * @param {String} filePath
	 * @returns {Promise<void>}
	 */
	async fixExifDate(filePath) {
		await ep.open();
		let metadata = await ep.readMetadata(filePath, ['DateTimeOriginal', 'ModifyDate', 'CreateDate']);
		if (!metadata.data[0].DateTimeOriginal && !metadata.data[0].ModifyDate && !metadata.data[0].CreateDate) {
			logger.warn(`The file ${filePath} has incomplete exif data. Going to complete it using the file modification time...`);
			await ep.writeMetadata(filePath, {}, [
				'overwrite_original_in_place',
				'DateTimeOriginal<FileModifyDate',
				'ModifyDate<FileModifyDate',
				'CreateDate<FileModifyDate',
				'FileModifyDate<FileModifyDate'
			]);
			// TODO : Validate write success
		}
		await ep.close();
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

module.exports = Client;