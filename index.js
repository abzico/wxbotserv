const req = require('request-promise-native');
const phantom = require('phantom');
let _ph, _page;

phantom.create()
	.then((ph) => {
		_ph = ph;
		return ph.createPage();
	})
	.then((page) => {
		_page = page;

		// request
		_page.on('onResourceRequested', (requestData) => {
			console.log('Requesting: ',requestData.url);

			// check if such url is qrcode image
			if (/https\:\/\/login.weixin\.qq\.com\/qrcode(.+?)/.test(requestData.url)) {
				// notify via slack
				notifyViaSlack(requestData.url);
			}
		});

		_page.on('onResourceReceived', (resource) => {
			console.log(resource);
		});

		return _page.open('https://wx.qq.com');
	})
	.then((status) => {
		console.log(status);
		return _page.property('content');
	})
	.catch((err) => {
		console.log(err);
	})

function notifyViaSlack(qrcodeImageUrl) {
	// notify via slack if SLACK_WEBHOOK_URL is set
	// if not set, then ignore
	if (process.env.SLACK_WEBHOOK_URL != null) {
		console.log('send msg to slack');
		console.log(qrcodeImageUrl);

		// create options to send a request
		var options = {
			method: 'POST',
			uri: process.env.SLACK_WEBHOOK_URL,
			headers: {
				'Content-Type': 'application/json',
				'Connection': 'Keep-Alive'
			},
			body: {
				'channel': 'server-notifier',
				'text': 'QRCode image is generated for login attempt.',
				"attachments": [
	        {
            'fallback': 'QRCode was generated for login attempt at ' + qrcodeImageUrl,
            'title': 'QRCode Login',
            'text': 'QRCode image was generated for login attempt at ' + getNiceCurrentDateTime(),
            'image_url': qrcodeImageUrl,
            'color': '#219b00'
	        }
		    ]
			},
			json: true
		};

		req(options)
			.then((res) => {
				console.log('Sent QRCode image to Slack!');
			})
			.catch((err) => {
				console.log(err);
			});
	}
}

function getNiceCurrentDateTime() {
	return new Date().toLocaleString();
}