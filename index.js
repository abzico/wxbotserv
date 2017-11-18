const req = require('request-promise-native');
const headless = require('./browser/headless.js');
const slackNotify = require('./notify/slack-notify.js');
const config = require('./config.js');
const logic = require('./logic.js');
let intervalId = null;
require('./promise-retry.js');

// listen when app is killed
let clearFn = function() {
	if (intervalId) clearInterval(intervalId);
	headless.clear();
	console.log('cleared resource from headless browser');
	process.exit();
}
// listen to all sigterm signals
process.on('SIGINT', () => { clearFn(); });

// open url along with callbacks
headless.openURL('https://wx.qq.com', {
	onLoadFinished: (status) => {
		if (status == 'success') {
			console.log('--- Page finished loading ---');

			// clear interval first if already created
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
			// now the page is loaded successfully
			intervalId = setInterval(() => {
				logic.processMsgs(headless);
			}, config.processMsgDelay);
		}
	},

	onResourceRequested: (requestData) => {
		console.log('Requesting: ',requestData.url);

		// check if such url is qrcode image
		if (/https\:\/\/login.weixin\.qq\.com\/qrcode\/(?:.+?)/.test(requestData.url)) {

			// notify via slack if SLACK_WEBHOOK_URL is set
			// if not set, then ignore
			if (process.env.SLACK_WEBHOOK_URL != null) {
				console.log('sending msg to slack');
				// notify via slack
				slackNotify.sendMsg(requestData.url, process.env.SLACK_WEBHOOK_URL)
					.then((res) => {
						console.log('Sent QRCode image to slack successfully.');
					})
					.catch((err) => {
						console.log('Error sending QRCode image to slack.');
					});
			}
		}
	},

	onResourceReceived: (resource) => {
		//console.log('received resource: ', resource);
	}
})
.then((content) => {
	console.log('----------------------------');
});