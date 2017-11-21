const wxMediator = require('./wechat/mediator.js');
const syncPromiseLoop = require('./promise-syncloop.js');
const logger = require('./log/logger.js');

var _ = {
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