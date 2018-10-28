const path = require('path');
const envPath = path.join(__dirname, '..', '/.env');
require('dotenv').config({path : envPath});

const expect = require('chai').expect;
const Uploader = require('../../uploader');
const uploader = new Uploader();

describe('Client', function() {
	before(function(done) {
		await uploader.connect();
		done();
	});

	it('Should create a new album', function(done) {
		const albumID = await uploader.createAlbum('My new album');
		expect(albumID).to.be.ok;
		done();
	});
});