// Copyright 2012-2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const http = require('http');
const url = require('url');
const querystring = require('querystring');
require('dotenv').config();
const opn = require('opn');
const destroyer = require('server-destroy');
const {google} = require('googleapis');
const config = require('./config');

const AUTH_PORT = process.env.AUTH_PORT || 3000;

const oauth2Client = new google.auth.OAuth2(
	process.env.CLIENT_ID,
	process.env.CLIENT_SECRET,
	`http://localhost:${AUTH_PORT}/oauth2callback`
);

google.options({auth: oauth2Client});

/**
 * Open an http server to accept the oauth callback. In this simple example, the only request to our webserver is to /callback?code=<code>
 */
async function authenticate(scopes) {
	return new Promise((resolve, reject) => {
		// grab the url that will be used for authorization
		const authorizeUrl = oauth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: scopes.join(' '),
		});
		const server = http
			.createServer(async (req, res) => {
				try {
					if (req.url.indexOf('/oauth2callback') > -1) {
						const qs = querystring.parse(url.parse(req.url).query);
						res.end('Authentication successful! Please return to the console.');
						server.destroy();
						const {tokens} = await oauth2Client.getToken(qs.code);
						oauth2Client.credentials = tokens;
						resolve(oauth2Client);
					}
				} catch (e) {
					reject(e);
				}
			})
			.listen(3000, () => {
				// open the browser to the authorize url to start the workflow
				opn(authorizeUrl, {wait: false}).then(cp => cp.unref());
			});
		destroyer(server);
	});
}

module.exports = authenticate;