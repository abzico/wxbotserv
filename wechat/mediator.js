
var _ = {

	/**
	 * Check if there's any new muted or unmuted message, and also click on that conversation with target user/group chat associated with this new message.
	 * @param  {Object}  headless Headless Object
	 * @param {Boolean} markAsPreviousItem Whether to mark as previous item. Default is false.
	 * @return {Object}           Promise object. If new message is found, then result will contain number of new message, otherwise return false.
	 */
	checkNewMsgAndClickOnIt: function(headless, markAsPreviousItem=false) {
		return headless.page.evaluate(function(markAsPreviousItem) {
			// combine both type of messgae (unmuted and muted)
			// whichever we find first, then we use that one
			var elem = document.querySelector('.icon.web_wechat_reddot_middle, .icon.web_wechat_reddot');
			if (elem == null) {
				return false;
			}
			else {
				// we're interested in its parent node
				if (elem.parentElement == null) {
					return false;
				}
				else {
					// get number of new messages first
					var newMsgs = elem.innerText || elem.textContent;
					// if newMsgs is empty or null, then we knew this is muted msg
					if (newMsgs == null || newMsgs == '') {
						// set it to 1 new message (as we don't have mechanism to track latest msg yet)
						newMsgs = 1;
					}

					// get parent element
					// note: we need to get parent element because we need to set attribute to mark as previous item at this level, and works as tested to be able to click on it
					var parentElem = elem.parentElement;

					// click on conversation of target user/group chat associated with this new messages
					parentElem.click();
					// need to mark as previous item or not
					if (markAsPreviousItem) {
						parentElem.setAttribute('data-wxbotserv-previousitem-id', "1");
					}
					else {
						if (item.hasAttribute('data-wxbotserv-previousitem-id')) {
							parentElem.setAttribute('data-wxbotserv-previousitem-id', "0");
						}
					}
					// return with number of new messages
					return parseInt(newMsgs);
				}
			}
		}, markAsPreviousItem);
	},

	/**
	 * Click on filehelper user.
	 * @param  {Object} headless Headless object.
	 * @param {Boolean} markAsPreviousItem Whether to mark as previous item. Default is false.
	 * @return {Object}          Promise object. When operation finishes, return true if it found such filehelper element and click on it, otherwise return false.
	 */
	clickOnFilehelper: function(headless, markAsPreviousItem=false) {
		return headless.page.evaluate(function(markAsPreviousItem) {
			var item = document.querySelector('div.chat_item.slide-left[data-username="filehelper"]');
			if (item) {
				item.click();
				// need to mark as previous item or not
				if (markAsPreviousItem) {
					item.setAttribute('data-wxbotserv-previousitem-id', "1");
				}
				else {
					if (item.hasAttribute('data-wxbotserv-previousitem-id')) {
						item.setAttribute('data-wxbotserv-previousitem-id', "0");
					}
				}

				return true;
			}
			else {
				return false;
			}
		}, markAsPreviousItem);
	},

	/**
	 * Click on last conversation with user.
	 * @param  {Object} headless Headless object
	 * @param {Boolean} markAsPreviousItem Whether to mark as previous item. Default is false.
	 * @return {Object}          Promise object. Success contains true as result, otherwise failure contains false.
	 */
	clickOnLastConvoInDOM: function(headless, markAsPreviousItem=false) {
		return headless.page.evaluate(function(markAsPreviousItem) {
			var convoDivs = document.querySelectorAll('div.chat_item.slide-left');
			if (convoDivs.length > 0 ) {
				var lastDiv = convoDivs[convoDivs.length - 1];
				lastDiv.click();

				if (markAsPreviousItem) {
					lastDiv.setAttribute('data-wxbotserv-previousitem-id', "1");
				}
				else {
					if (lastDiv.hasAttribute('data-wxbotserv-previousitem-id')) {
						lastDiv.setAttribute('data-wxbotserv-previousitem-id', "0");
					}
				}

				return true;
			}
			else {
				return false;
			}
		}, markAsPreviousItem);
	},

	/**
	 * Click on convo item that is marked as previous item.
	 *
	 * If there's multiple of such marked item, it will only use the first one that found.
	 *
	 * @param  {Objct} headless Headless object.
	 * @return {Object}          Promise object. Success will contain true if it successfully clicked on such item, otherwise it will contain false.
	 */
	clickOnItemMarkedAsPreviousItem: function(headless) {
		return headless.page.evaluate(function() {
			// as tested: need to click on its child 'div'
			// click on parent div only works on file helper
			var item = document.querySelector('[data-wxbotserv-previousitem-id="1"]');
			if (item) {
				item.click();
				return true;
			}
			else {
				return false;
			}
		});
	},

	/**
	 * Get latest N message from clicked conversation of target user/group chat.
	 * If N is greater than number of messages, then it will return all the messages, otherwise it will return only latest N messages.
	 *
	 * In case of there's error in parsing message or its context, that message will be skipped. At the end no matter what, it will return result array of messages.
	 * @param  {Object} headless Headless object
	 * @param {Number} n Number of message to get
	 * @return {Object}          	Promise object. Success will return array of messages.
	 */
	getLatestNMsg: function(headless, n) {
		// supp;y n as parameter into evaluate function
		return headless.page.evaluate(function(n) {
			// convert from NodeList to Array
			var msgDivs = Array.prototype.slice.call(document.querySelectorAll('div.ng-scope[ng-repeat="message in chatContent"] .bubble.js_message_bubble.bubble_default.left'));

			// if there's no message
			if (msgDivs.length <= 0) {
				return [];
			}

			// check to slice msgDivs
			// note: we don't remove old messages out from DOM at the moment
			if (n < msgDivs.length) {
				msgDivs = msgDivs.slice(msgDivs.length - n, msgDivs.length);
			}

			// result messages to return
			var retMsgs = [];

			// loop through all messages, then get actual message text
			// from oldest to newest as we will process who entered the command first
			for (var i=0; i<msgDivs.length; i++) {
				var msgDiv = msgDivs[i];

				// get message context
				var contextJsonStr = msgDiv.getAttribute('data-cm');
				var contextObj = null;

				// check if context string exists
				// then we parse it into object and save for later
				if (contextJsonStr == null || contextJsonStr == '') {
					continue;
				}
				else {
					try {
						contextObj = JSON.parse(contextJsonStr);
					} catch(e) {
						// if there's no context on this message
						// then continue
						continue;
					}
				}

				// check for actual message
				var msgElem = msgDiv.querySelector('pre.js_message_plain');
				var actualMessage = null;
				if (msgElem && (msgElem.innerText || msgElem.textContent)) {
					// set actual message for later adding into result messages
					actualMessage = msgElem.innerText || msgElem.textContent;
				}
				else {
					// otherwise for other errors
					continue;
				}

				// check if we have both message context, and actual message
				// to add into result messages or not
				if (contextObj && actualMessage) {
					retMsgs.push({
						context: contextObj,
						message: actualMessage
					});
				}
				else {
					// otherwise we skip
					continue;
				}
			}

			// it's ok to return as object (Array in this case)
			return retMsgs;
		}, n);
	},

	/**
	 * Set reply message to current active conversation.
	 * @param  {Object} headless Headless object
	 * @param  {String} msg         Message to send to user
	 * @return {Object}             Promise object. Success returns with boolean for resulf of operation. If there's any error during operation, it fails promise.
	 */
	setReplyMsg: function(headless, msg) {
		// supply msg, and receiveUser as parameter
		return headless.page.evaluate(function(msg) {
			// add text into text area
			var textAreaElem = document.querySelector('#editArea');
			if (textAreaElem) {
				textAreaElem.focus();
				textAreaElem.innerHTML = msg;
				textAreaElem.innerText = msg;
				return true;
			}
			else {
				return false;
			}
		}, msg);
	},

	/**
	 * Click on send button to send current reply message.
	 * @param  {Object} headless Headless object
	 * @return {Object}          Promise object. Success return with boolean for result of operation.
	 */
	clickOnSendButton: function(headless) {
		return headless.page.evaluate(function() {
			// find button to click
			var buttonElem = document.querySelector('a.btn.btn_send');
			if (buttonElem) {
				buttonElem.click();

				return true;
			}
			else {
				return false;
			}
		});
	}
};

module.exports = _;