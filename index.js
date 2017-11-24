const req = require('request-promise-native');
const headless = require('./browser/headless.js');
const slackNotify = require('./notify/slack-notify.js');
const defaultConfigs = require('./config.js');
const logic = require('./logic.js');
const logger = require('./log/logger.js');
const events = require('./events/events.js');
const eventsConst = require('./events/events-const.js');
let intervalId = null;
require('./promise-retry.js');

// listen when app is killed
let clearFn = function() {
	if (intervalId) clearInterval(intervalId);
	headless.clear();
	logger.log('cleared resource from headless browser');
	process.exit();
}
// listen to all sigterm signals
process.on('SIGINT', () => { clearFn(); });

/**
 * Start the bot with options.
 * @param {Function} msgProcessorFn Message processing callback for each incoming message that bot receives. Signature is fn(msgObj) in which msgObj is { context: <Object>, message: <String> } and needs to return string as a response to send back as reply message.
 * @param {Object} options (Optional) options to start the bot. It can be as follows.
 * {  
 * `processMsgDelay`: *Number* = Delay between each processing message. In millisecond.,  
 * `debugLog`: *Number* = index of record to start,  
 * }
 * @return {Object} Promise object. Success will contain no data response if the bot starts normally, otherwise return false with Error object. Success returned doesn't mean that the bot get passed login screen, user still need to scan to proceed.
 */
function start(msgProcessorFn, options) {

	// set logging enabled
	if (options && options.debugLog != null) {
		logger.setEnableLogging(options.debugLog);
	}

	return new Promise((resolve, reject) => {
		// open url along with callbacks
		headless.openURL('https://wx.qq.com', {
			onLoadFinished: (status) => {
				if (status == 'success') {
					// emit event
					events.emit(eventsConst.onLoadFinished);

					logger.log('--- Page finished loading ---');

					// try to get all contacts once
					logic.getAllContacts(headless)
						.then((contacts) => {
							
							// emit event with contacts
							events.emit(eventsConst.onGotAllContacts, contacts);

							// clear interval first if already created
							if (intervalId) {
								clearInterval(intervalId);
								intervalId = null;
							}
							// now the page is loaded successfully
							// use delay from specified options or default value
							intervalId = setInterval(() => {
								logic.processMsgs(headless, msgProcessorFn);
							}, defaultConfigs.processMsgDelay || (options && options.processMsgDelay));
						})
						.catch((err) => {
							logger.log(err);
						});
				}
			},

			onResourceRequested: (requestData) => {
				// emit event
				events.emit(eventsConst.onResourceRequested, requestData);

				logger.log('Requesting: ',requestData.url);

				// check if such url is qrcode image
				if (/https\:\/\/login.weixin\.qq\.com\/qrcode\/(?:.+?)/.test(requestData.url)) {

					// notify via slack if SLACK_WEBHOOK_URL is set
					// if not set, then ignore
					if (process.env.SLACK_WEBHOOK_URL != null) {
						logger.log('sending msg to slack');
						// notify via slack
						slackNotify.sendMsg(requestData.url, process.env.SLACK_WEBHOOK_URL)
							.then((res) => {
								logger.log('Sent QRCode image to slack successfully.');
							})
							.catch((err) => {
								logger.log('Error sending QRCode image to slack.');
							});
					}
				}
			},

			onResourceReceived: (resource) => {
				// emit event
				events.emit(eventsConst.onResourceReceived, resource);

				//logger.log('received resource: ', resource);
			}
		})
		.then((content) => {
			logger.log('successfully started the bot');
			resolve();
		})
		.catch((err) => {
			logger.log('failed to start the bot [', err);
			reject(err);
		});
	});
}

module.exports = {
	start: start,
	events: events
}