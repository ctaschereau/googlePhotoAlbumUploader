const path = require('path');
const envPath = path.join(__dirname, '..', '/.env');
require('dotenv').config({path : envPath});

const expect = require('chai').expect;
const Client = require('../../lib/client');
const client = new Client();

describe('Client', function() {
	before(function(done) {
		await client.connect();
		done();
	});

	it('Should create a new album', function(done) {
		const albumID = await client.createAlbum('My new album');
		expect(albumID).to.be.ok;
		done();
	});
});