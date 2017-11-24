require('./promise-retry.js');
const wxMediator = require('./wechat/mediator.js');
const syncPromiseLoop = require('./promise-syncloop.js');
const logger = require('./log/logger.js');
const events = require('./events/events.js');
const eventsConst = require('./events/events-const.js');

// flag indicate whether we load all contact according to Internet request
var isLoadedContacts = false;

// receive onResourceReceived event
events.on(eventsConst.onResourceReceived, (resource) => {
	// if phantom makes request for contact, and we received the response
	// then we will mark that we received information
	if (/^https:\/\/web\.wechat\.com\/cgi-bin\/mmwebwx-bin\/webwxbatchgetcontact.+/.test(resource.url)) {
		logger.log('received response for contact request');
		isLoadedContacts = true;
	}

	logger.log('received response: ' + resource.url);
});

function waitUntilContactLoaded() {
	return Promise.retryEndlessly(() => {
		if (isLoadedContacts) return Promise.resolve();
		else return Promise.reject();
	}, 100);
}

var _ = {

	/**
	 * All contacts
	 * @type {Array}
	 */
	contacts: null,

	/**
	 * Get all contacts.
	 *
	 * It will click on contact tab button, then parse DOM to extract needed information before returning it.
	 * @param  {Object} headless Headless object
	 * @return {Object}          Promise object. Success contains array of contact which is { wechat_id: <String>, display_name: <String>, avatar_url: <String> }. Otherwise failure contains null.
	 */
	getAllContacts: function(headless) {
		var that = this;

		return new Promise((resolve, reject) => {
			// click on contact tab button
			wxMediator.clickOnContactTabButton(headless)
				.then((result) => {
					if (result) {
						logger.log('clicked on contact tab button')

						// wait until contact is loaded
						waitUntilContactLoaded().then(() => {
							logger.log('contacts are loaded');
							// get all contacts
							wxMediator.getAllContacts(headless)
								.then((contacts) => {
									// save contacts
									that.contacts = contacts;

									// click on chat tab button
									wxMediator.clickOnChatTabButton(headless)
										.then((result) => {
											if (result) {
												logger.log('clicked on chat tab button');
												resolve(that.contacts);
											}
											else {
												logger.log('failed to click on chat tab button');
												reject(false);
											}
										})
										.catch((err) => {
											logger.log('error trying to click on chat tab button');
											reject(err);
										});
								})
								.catch((err) => {
									reject(err);
								});
						});
					}
					else {
						logger.log('failed to click on contact tab item');
						reject(false);
					}
				})
				.catch((err) => {
					logger.log('error trying to click on contact tab item');
					reject(err);
				});
		});
	},

	/**
	 * Process messages.
	 * @param  {Object} headless Headless object
	 * @param {Function} processorFn (Optional) Message processor function with signature fn(msgObj) in which msgObj is { context: <Object>, message: <String> }. The function needs to return string as a reply back of receiving message.
	 */
	processMsgs: function(headless, processorFn) {

		// check normal new msg
		wxMediator.checkNewMsgAndClickOnIt(headless, true)
			.then((newMsgs) => {
				if (newMsgs != 0 && newMsgs != false) {
					logger.log(`found (${newMsgs}) new messages`);

					// get latest N messgaes
					wxMediator.getLatestNMsg(headless, newMsgs)
						.then((msgs) => {
							logger.log('got msgs: ', msgs);

							// create workerFn (see signature of function in promise-syncloop.js)
							// 1st argument is array of messages which is 'msgs' above
							let workerFn = function(i, ...args) {
								return new Promise((resolve, reject) => {
									// get message from input parameter
									let msgs = args[0];
									// get individual message
									let msg = msgs[i];

									if (processorFn != null) {
										// call custom processor callback to get reply message
										var replyMsg = processorFn(msg);

										// validate
										if (replyMsg == null || typeof replyMsg !== 'string') {
											// return immediately, and skip to next message
											return resolve();
										}

										// set reply message
										wxMediator.setReplyMsg(headless, replyMsg)
											.then((result) => {
												if (result) {
													logger.log('successfully set reply msg to textarea');

													// workaround: switch to file transfer
													// in order to let text message update to DOM
													wxMediator.clickOnFilehelper(headless)
														.then((result) => {
															if (result) {
																logger.log('[work around] successfully clicked on file helper');

																// click on previously marked convo item
																wxMediator.clickOnItemMarkedAsPreviousItem(headless)
																	.then((result) => {
																		if (result) {
																			logger.log('successfully clicked on prevoiusly marked item');

																			// click on send button
																			wxMediator.clickOnSendButton(headless)
																				.then((result) => {
																					if (result) {
																						logger.log('successfully clicked on send button');
																						resolve();
																					}
																					else {
																						logger.log('failed to click on send button');
																						resolve();
																					}
																				})
																				.catch((err) => {
																					logger.log(err);

																					// resolve it, and process next message
																					resolve();
																				});
																			}
																			else {
																				logger.log('failed to click on previously marked item');
																				resolve();
																			}
																	})
																	.catch((err) => {
																		logger.log('failed to click on previously marked item');
																		resolve();
																	});
																}
																else {
																	logger.log('[work around] failed to click on file helper');
																	resolve();
																}
														})
														.catch((err) => {
															logger.log('[work around] failed to click on file helper');
															resolve();
														});
												}
												else {
													logger.log('failed to set reply msg to textarea');

													// resolve it, and process next message
													resolve();
												}
											}).catch((err) => {
												logger.log(err);

												// resolve it, and process next message
												resolve();
											});
									}
									else {
										// processor callback for message isn't set, then ignore it
										logger.log('processor callback isn\'t set, skip processing');
										// just ignore this message
										resolve();
									}
								});
							};

							// process messages from oldest to newest
							syncPromiseLoop(msgs.length, workerFn, msgs)
								.then(() => {
									// all done
									// click on filehelper to allow us to detect new msgs again
									wxMediator.clickOnFilehelper(headless)
										.then((foundAndClicked) => {
											if (foundAndClicked) {
												logger.log('clicked on filehelper');
											}
										})
										.catch((err) => {
											logger.log(err);
										});
								})
								.catch((err) => {
									logger.log(err);
								});
						})
						.catch((err) => {
							logger.log(err);
						});
				}
			})
			.catch((err) => { 
				logger.log(err);
			});
	}
};

module.exports = _;