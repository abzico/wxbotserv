const wxMediator = require('./wechat/mediator.js');
const syncPromiseLoop = require('./promise-syncloop.js');
const logger = require('./log/logger.js');

var _ = {
	/**
	 * Process messages.
	 * @param  {Object} headless Headless object
	 * @return {[type]}          [description]
	 */
	processMsgs: function(headless) {

		// check normal new msg
		wxMediator.checkNewMsg(headless)
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

									// TODO: Refactor this part out to message userland so user can add customized code
									if (msg.context.type === 'message' && (msg.message === 'test1' || msg.message === 'test2')) {
										// set reply message
										wxMediator.setReplyMsg(headless, 'reply:' + msg.message)
											.then((result) => {
												if (result) {
													logger.log('successfully set reply msg to textarea');

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
										logger.log('not support message type');
										// just ignore this message
										// resolve it, if reject it will stop here
										resolve();
									}
									// -- end of what-should-be-in-userland --
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