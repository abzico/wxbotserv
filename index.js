const req = require('request-promise-native');
const headless = require('./browser/headless.js');
const slackNotify = require('./notify/slack-notify.js');

// listen when app is killed
process.on('SIGINT', () => {
	headless.clear();
	console.log('cleared resource from headless browser');
});

// open url along with callbacks
headless.openURL('https://wx.qq.com', {
	onLoadFinished: (status) => {
		console.log(status);

		if (status == 'success') {
			detectMsg();
		}
	},

	onResourceRequested: (requestData) => {
		console.log('Requesting: ',requestData.url);

		// check if such url is qrcode image
		if (/https\:\/\/login.weixin\.qq\.com\/qrcode(.+?)/.test(requestData.url)) {

			// notify via slack if SLACK_WEBHOOK_URL is set
			// if not set, then ignore
			if (process.env.SLACK_WEBHOOK_URL != null) {
				// notify via slack
				slackNotify.sendMsg(requestData.url, process.env.SLACK_WEBHOOK_URL);	
			}
		}
	},

	onResourceReceived: (resource) => {
		console.log(resource);
	}
})
.then((content) => {
	console.log('----------------------------');
	console.log(headless.page != null);
	console.log(headless.instance != null);
});


function detectMsg() {
	console.log('it\'s all started');
}