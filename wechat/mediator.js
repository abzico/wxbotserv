var _ = {

	/**
	 * Check if there's any new message, and also click on that conversation with target user/group chat associated with this new message.
	 * @param  {Object}  headless Headless Object
	 * @return {Object}           Promise object. If new message is found, then result will contain number of new message, otherwise return 0.
	 */
	checkNewMsg: function(headless) {
		return headless.page.evaluate(function() {
			var elem = document.querySelector('.icon.web_wechat_reddot_middle');
			if (elem == null) {
				return null;
			}
			else {
				// click on conversation of target user/group chat associated with this new messages
				elem.click();
				// return number of new messages
				var newMsgs = elem.innerText || elem.textContent;
				return parseInt(newMsgs);
			}
		});
	},

	/**
	 * Check if there's any new message, and also click on that conversation with target user/group chat associated with this new message.
	 *
	 * Please note that we didn't keep track of latest message received at the moment, thus for muted conversation you can't know number of new messages received.
	 * 
	 * @param  {Object} headless Headless object
	 * @return {Object}          Promise object. If new message is found, then result will return true, otherwise return false.
	 */
	checkNewMutedMsg: function(headless) {
		return headless.page.evaluate(function() {
			var elem = document.querySelector('.icon.web_wechat_reddot');
			if (elem == null) {
				return false;
			}
			else {
				// click on conversation of target user/group chat associated with this new messages
				elem.click();
				return true;
			}
		});
	},

	/**
	 * Detect whether there's a new message or not for unmuted chat.
	 * @param  {Object} headless headless browser object
	 * @return {Object}          Promise object
	 */
	detectMsg: function(headless) {
		if (headless.page) {
			return new Promise((resolve, reject) => {
				headless.page.evaluate(function() {
					var elem = document.querySelector('.icon.web_wechat_reddot_middle');
					if (elem == null) {
						//return { err: new Error('not found'), result: null };
						return 1;
					}
					else {
						// get number of messages
						var numberOfNewMsgs = elem.innerText || elem.textContent;
						// click on such convo
						elem.click();

						// now convo is clicked, messages are added into DOM
						// extract all message-div in conversation
						var msgDivs = document.querySelectorAll('div.ng-scope[ng-repeat="message in chatContent"] .bubble.js_message_bubble.bubble_default.left');
						if (msgDivs.length == 0) {
							// click on filehelper (File Transfer) user
							var item = document.querySelector('div.chat_item.slide-left[data-username="filehelper"]');
							if (item) item.click();
							// -- end section to click on file transfer

							//return { err: new Error('not found'), result: null };
							return 2;
						}
						else {
							// result object to return
							var ret = { context: null, text: null };
							// extract last message-div in conversation
							var msgDiv = msgDivs[msgDivs.length - 1];

							// extract message context
							var contextJsonStr = elem.getAttribute('data-cm');
							if (contextJsonStr == null || contextJsonStr == '') {
								// click on filehelper (File Transfer) user
								var item = document.querySelector('div.chat_item.slide-left[data-username="filehelper"]');
								if (item) item.click();
								// -- end section to click on file transfer

								//return { err: new Error('message\'s context is null or invalid.'), result: null };
								return 3;
							}
							else {
								try {
									// get message context object
									var msgContext = JSON.parse(contextJsonStr);
									// save as property in result object
									ret.context = msgContext;
								}
								catch(e) { 
									// click on filehelper (File Transfer) user
									var item = document.querySelector('div.chat_item.slide-left[data-username="filehelper"]');
									if (item) item.click();
									// -- end section to click on file transfer

									//return { err: new Error('cannot do JSON-parsing for message\'s context'), result: null };
									return 4;
								}
							}

							// extract actual text message
							var msgElem = msgDiv.querySelector('pre.js_message_plain');
							// save text as result
							if (msgElem) ret.text = msg.innerText || msg.textContent;

							// return result
							//return { err: null, result: ret };
							return JSON.stringify(ret);
						}
					}
				}).then((res) => {
					console.log(res);

					if (res) {
						resolve(JSON.parse(res));
					}
					else {
						reject(new Error('not found or error occur'));
					}
				})
				.catch((err) => {
					reject(err);
				});
			})
		}
		else {
			// if not then reject right away
			Promise.reject(new Error('headless\'s page property cannot be null.'));
		}
	}
};

module.exports = _;