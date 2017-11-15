const req = require('request-promise-native');
const phantom = require('phantom');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
let dom = null;
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
		// receive
		// _page.on('onResourceReceived', (resource) => {
		// 	if (resource.redirectURL) {
		// 		console.log('redirect:' + resource.redirectURL);
		// 	}
		// });

		return _page.open('https://wx.qq.com');
	})
	.then((status) => {
		console.log(status);
		return _page.property('content');
	})
	// .then((content) => {
	// 	//console.log(content);

	// 	// prepare url for opening
	// 	let reqTimestamp = Date.now();
	// 	let redirectUri = 'https%3A%2F%2Fwx.qq.com%2Fcgi-bin%2Fmmwebwx-bin%2Fwebwxnewloginpage&fun=new&lang=en_US&_=' + reqTimestamp;

	// 	// open login page
	// 	return _page.open('https://login.wx.qq.com/jslogin?appid=wx782c26e4c19acffb&redirect_uri=' + redirectUri);
	// })
	// .then((status) => {
	// 	console.log(status);
	// 	return _page.property('content');
	// })
	// .then((content) => {
	// 	// get result of QRCode url
	// 	console.log(content);

	// 	var qrcodeImageUrl = 'https://login.weixin.qq.com/qrcode/' + /window.QRLogin.uuid = \"(.+?)\";/.exec(content)[1];
	// 	console.log('Got qrcode image url: ' + qrcodeImageUrl);
	// 	// notify image to slack
	// 	notifyViaSlack(qrcodeImageUrl);
	// })
	.catch((err) => {
		console.log(err);
	})

// let options = {
// 		method: 'GET',
// 		uri: 'https://wx.qq.com',
// 		headers: {
// 			'Connection': 'Keep-Alive'
// 		}
// 	};

// 	req(options)
// 		.then((html) => {
// 			dom = new JSDOM(html, { runScripts: "dangerously" });
// 			printQRCodeImageUrl(dom);
// 			cont();
// 		})
// 		.catch((err) => {
// 			console.log(err);
// 		});

function printQRCodeImageUrl(dom) {
	let document = dom.window.document;
	let mmsrc = document.getElementsByClassName('qrcode')[0].getElementsByClassName('img')[0].getAttribute('mm-src');
	console.log(mmsrc);
}

function cont() {
	
	let options = {
		method: 'GET',
		uri: 'https://login.wx.qq.com/jslogin?appid=wx782c26e4c19acffb&redirect_uri=' + redirectUri,
		headers: {
			'Connection': 'Keep-Alive'
		}
	};

	// make a request to WeChat's base login URL
	req(options)
		.then((res) => {
			// form qrcode image url
			var qrcodeImageUrl = 'https://login.weixin.qq.com/qrcode/' + /window.QRLogin.uuid = \"(.+?)\";/.exec(res)[1];

			// make a request back to original
			let options = {
				method: 'GET',
				uri: redirectUri,
				headers: {
					'Connection': 'Keep-Alive'
				}
			};
			req(options)
				.then((html) => {
					dom = new JSDOM(html, { runScripts: "dangerously" } );
					printQRCodeImageUrl(dom);
				})
				.catch((err) => {
					console.log(err);
				});

			// notify image to slack
			notifyViaSlack(qrcodeImageUrl);
		})
		.catch((err) => {
			console.log(err);
		});
}

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