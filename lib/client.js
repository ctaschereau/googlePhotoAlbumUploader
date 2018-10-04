'use strict';
const fs = require('fs');
const request = require('request-promise');
const path = require('path');

const oauth = require('../oauth');
const config = require('../config');

class Client {
	constructor() {

	}

	async connect() {
		let client = await oauth(config.GOOGLE_PHOTO_API_AUTH_SCOPES);
		this.accessToken = client.credentials.access_token;
	}

	async getAlbumID(albumName) {
		let res = await request.post(`${config.GOOGLE_PHOTO_API_BASE_PATH}/v1/albums`, {
			headers : {'Content-Type' : 'application/json'},
			json : true,
			auth : {'bearer' : this.accessToken},
			body : {
				"album" : {"title" : albumName}
			}
		});

		logger.info(`Created the album "${albumName}".`);

		return res.id;
	}

	async uploadPhoto(filePath, albumID) {
		let fileContent = await fs.readFile(filePath);

		let uploadToken = await request.post(`${config.GOOGLE_PHOTO_API_BASE_PATH}/v1/uploads`, {
			headers : {
				'Content-Type' : 'application/octet-stream',
				'X-Goog-Upload-File-Name' : path.basename(filePath),
				'X-Goog-Upload-Protocol' : 'raw'
			},
			auth : {'bearer' : this.accessToken},
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
			auth : {'bearer' : this.accessToken},
			body : postBody
		});

		// TODO : Validate that the file was correctly uploaded?

		logger.info(`File "${path.basename(filePath)}" was uploaded successfully.`);
	};
}

module.exports = Client;