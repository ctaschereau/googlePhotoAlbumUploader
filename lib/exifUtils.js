'use strict';

const exiftool = require('node-exiftool');
const exiftoolBin = require('dist-exiftool');
const ep = new exiftool.ExiftoolProcess(exiftoolBin);

const logger = require('../logger');

class exifUtils {

	/**
	 * In case the file does not have an EXIF date, assign one using the file's modification time.
	 * In the case where the filepath does not indicate a file with EXIF data, nothing will be done.
	 * @param {String} filePath
	 * @returns {Promise<void>}
	 */
	static async fixExifDate(filePath) {
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

}

module.exports = exifUtils;