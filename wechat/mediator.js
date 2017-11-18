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
	 * Click on filehelper user.
	 * @param  {Object} headless Headless object.
	 * @return {Object}          Promise object. When operation finishes, return true if it found such filehelper element and click on it, otherwise return false.
	 */
	clickOnFilehelper: function(headless) {
		return headless.page.evaluate(function() {
			var item = document.querySelector('div.chat_item.slide-left[data-username="filehelper"]');
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

			return retMsgs;
		}, n);
	}
};

module.exports = _;