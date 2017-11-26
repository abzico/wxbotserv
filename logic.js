require('./promise-retry.js');
const wxMediator = require('./wechat/mediator.js');
const syncPromiseLoop = require('./promise-syncloop.js');
const logger = require('./log/logger.js');
const events = require('./events/events.js');
const eventsConst = require('./events/events-const.js');

// flag indicate whether we load all contact according to Internet request
var isLoadedContactsCurrentPage = false;

// receive onResourceReceived event
events.on(eventsConst.onResourceReceived, (resource) => {
	// if phantom makes request for contact, and we received the response
	// then we will mark that we received information
	if (/^https:\/\/web\.wechat\.com\/cgi-bin\/mmwebwx-bin\/webwxbatchgetcontact.+/.test(resource.url)) {
		logger.log('received response for contact request');
		isLoadedContactsCurrentPage = true;
	}

	logger.log('received response: ' + resource.url);
});

/**
 * Wait until contact-loaded flag is set.
 * @return {Object}         Promise object.
 */
function waitUntilContactLoaded(timeout=10000) {
	var countingTime = 0;

	return Promise.retryEndlessly(() => {
		if (isLoadedContactsCurrentPage) return Promise.resolve();
		else return Promise.reject();
	}, 100);
}

/**
 * Wait until contact-loaded flag is set or until timeout is up.
 * @param  {Number} timeout (optional) Timeout if reached then return success in ms. Default is 5000 ms.
 * @return {Object}         Promise object.
 */
function waitUntilContactLoadedOrTimeout(timeout=10000) {
	var countingTime = 0;

	return Promise.retryEndlessly(() => {
		if (isLoadedContactsCurrentPage) return Promise.resolve();
		else {
			countingTime += 100;
			if (countingTime >= timeout) {
				return Promise.resolve();
			}
			else {
				return Promise.reject();
			}
		}
	}, 100);
}

var _ = {

	/**
	 * All contacts
	 * @type {Array}
	 */
	contacts: null,

	/**
	 * wxMediator object
	 * @type {Object}
	 */
	wxMediator: wxMediator,

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
						logger.log('clicked on contact tab button');

						// get all properties of scrollableDiv element
						wxMediator.getScrollableDivEssentialProperties(headless)
							.then((result) => {
								if (result == null) {
									logger.log('failed to get one or more property value from scrollableDiv element');
									reject(null);
								}
								else {
									logger.log('got all property values from scrollableDiv element');

									// get all properties
									var clientHeight = result.client_height;
									var scrollHeight = result.scroll_height;
									var scrollTop = result.scroll_top;

									logger.log('properties: ', result);

									// calculate number of page to navigate
									var numPage = Math.ceil(scrollHeight / clientHeight);

									logger.log(`need to get all contacts from ${numPage} page(s)`);

									// hold all contacts for each page here
									let allContacts = [];
									var bottomMostContactOfCurrPage = null;

									// create worker fn to work in promise-syncloop
									let workerFn = function(i, ...args) {
										return new Promise((_resolve, _reject) => {

											// get all contacts for the current page
											wxMediator.getContactsOnCurrentPageScrolledThenScrollToNextPage(headless, bottomMostContactOfCurrPage)
												.then((_contacts) => {
													if (_contacts != null && typeof _contacts === 'object') {
														logger.log('got contacts for page ' + (i+1), _contacts);

														// update bottom contact object to navigate page further
														bottomMostContactOfCurrPage = _contacts[_contacts.length - 1];

														logger.log('bottomMostContact: ', bottomMostContactOfCurrPage);
														
														// save contacts for our accumulated contacts to use later
														allContacts = allContacts.concat(_contacts);

														// invalidate contact loaded status
														isLoadedContactsCurrentPage = false;

														// wait as we might need to wait for contact-load status to be set
														waitUntilContactLoadedOrTimeout(300).then(() => {
															logger.log('contacts are loaded, or timeouted');

															_resolve();
														});
													}
													else {
														logger.log('failed to get contacts for current page');
														_reject();
													}
												})
												.catch((err) => {
													logger.log('error to get contacts from current page');
													_reject(err);
												});
										});
									};

									// only for first time we wait for contact-load flag to be set first
									waitUntilContactLoaded().then(() => {
										logger.log('contacts are loaded, ready to proceed getting all contacts');

										// navigate page from first to last
										syncPromiseLoop(numPage, workerFn)
											.then(() => {
												// all done
												logger.log('we got all contacts now!');
												// save all contacts to itself for later use
												that.contacts = allContacts;

												// click on chat tab button to return to normal
												// make others convenient to work without a need to click on chat tab button, or check before proceed again
												wxMediator.clickOnChatTabButton(headless)
													.then((result) => {
														if (result) {
															logger.log('successfully clicked on chat tab button (for conveient of other components to proceed work)');
															resolve(allContacts);
														}
														else {
															logger.log('failed to click on chat tab button (for conveient of other components to proceed work)');
															reject(false);
														}
													})
													.catch((err) => {
														logger.log('error trying to click on chat tab button (for conveient of other components to proceed work)');
														reject(err);
													});
											})
											.catch((err) => {
												logger.log(err);
												reject(err);
											});
									});
								}
							})
							.catch((err) => {
								logger.log('error to get one or more property value from scrollableDiv element');
								reject(err);
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
	 * @param {Array} onlySenderIds (optional) Array of sender ids if need to filter only new messages from this sender only without getting rid of new message notification across device & app. Sender id can be both normal user (prefixed with @) or group chat (prefiexed with @@). Default is null.
	 */
	processMsgs: function(headless, processorFn, onlySenderIds=null) {

		// check normal new msg
		wxMediator.checkNewMsgAndClickOnIt(headless, true, onlySenderIds)
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
											else {
												logger.log('failed to click on filehelper');
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