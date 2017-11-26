
var _ = {

	/**
	 * Check if there's any new muted or unmuted message, and also click on that conversation with target user/group chat associated with this new message.
	 * @param  {Object}  headless Headless Object
	 * @param {Boolean} markAsPreviousItem (optional) Whether to mark as previous item. Default is false.
	 * @param {Array} onlySenderIds (optional) Array of sender ids if need to filter only new messages from this sender only without getting rid of new message notification across device & app. Sender id can be both normal user (prefixed with @) or group chat (prefiexed with @@). Default is null.
	 * @return {Object}           Promise object. If new message is found, then result will contain number of new message, otherwise return false.
	 */
	checkNewMsgAndClickOnIt: function(headless, markAsPreviousItem=false, onlySenderIds=null) {
		return headless.page.evaluate(function(markAsPreviousItem, onlySenderIds) {
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
					// check if need to filter against sender id
					if (onlySenderIds != null && onlySenderIds.length > 0) {
						// 2 levels up in the chain of DOM hierarchy to get 'data-cm' that contains WeChat Id to compare
						// if not exist, then ignore it
						if (elem.parentElement != null && elem.parentElement.parentElement != null) {
							var targetElem = elem.parentElement.parentElement;
							var dataCm = targetElem.getAttribute('data-cm');
							try {
								var dataCmObj = JSON.parse(dataCm);
								var wechatId = dataCmObj.username;

								// compare wechatId to specified onlySenderIds
								// if not match then return false immediately
								var found = false;
								for (var i=0; i<onlySenderIds.length; i++) {
									if (onlySenderIds[i] === wechatId) {
										found = true;
										break;
									}
								}

								// if still not found then return it immediately
								if (!found) {
									return false;
								}
							} catch(e) {
								// ignore error
							}
						}
					}

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
		}, markAsPreviousItem, onlySenderIds);
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
	 * @return {Object}          	Promise object. Success will return array of messages. Individual message object is  
	 * {  
	 *  // context of message containing meta information about message itself
	 * 	context: {  
	 * 		type,	// <String>, type of message  
	 * 		actualSender,   // <String>, actualSender of the message, or say WeChat ID  
	 * 		msgType,  // <String>, message type  
	 * 		subType,  // <String>, message sub-type  
	 * 		msgId  	// <String>, message id  
	 *  },  
	 *  message  // <String>, actual message content  
	 * }
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
	},

	/**
	 * Click on chat tab button.
	 * @param  {Object} headless Headless object
	 * @return {Object}          Promise object. Success contains boolean for result of operation. Otherwise failure contains false as result.
	 */
	clickOnChatTabButton: function(headless) {
		return headless.page.evaluate(function() {
			var tabItem = document.querySelector('div.tab.no_reader div.tab_item a.chat[ui-sref="chat"]');
			if (tabItem) {
				tabItem.click();
				return true;
			}
			else {
				return false;
			}
		});
	},

	/**
	 * Click on contact tab button.
	 * @param  {Object} headless Headless object
	 * @return {Object}          Promise object. Success contains boolean for result of operation. Otherwise failure contains false as result.
	 */
	clickOnContactTabButton: function(headless) {
		return headless.page.evaluate(function() {
			var tabItem = document.querySelector('div.tab.no_reader div.tab_item.no_extra a.chat[ui-sref="contact"]');
			if (tabItem) {
				tabItem.click();
				return true;
			}
			else {
				return false;
			}
		});
	},

	/**
	 * Get contacts that visible on current page according to scroll position, then scroll next for one page.
	 * 
	 * @param  {Object} headless Headless object
	 * @param {Object} afterThisContact (optional) set contact object to start the iterating process to get all contacts of current page after the specified contact. If you try to get all contacts from multiple page, keep track of previous page's bottom-most contact object and supply to this function. Default is null.
	 * @return {Object}          Promise object. Success contains array of contacts [{ wechat_id: <String>, display_name: <String>, avatar_url: <String> }]. Otherwise failure contains null.
	 */
	getContactsOnCurrentPageScrolledThenScrollToNextPage: function(headless, afterThisContact=null) {
		return headless.page.evaluate(function(afterThisContact) {
			// get scrollable div element
			var scrollableDiv = document.querySelector('div.J_ContactScrollBody.scrollbar-dynamic.contact_list.scroll-content.scroll-scrolly_visible');
			if (scrollableDiv) {

				// get all contact elements
				var contactElements = scrollableDiv.querySelectorAll('div[mm-repeat="item in allContacts"] div.ng-isolate-scope[contact-item-directive] div.contact_item');
				// if there's no elements then return now
				if (contactElements.length <= 0) {
					return null;
				}
				else {
					// result we will return
					var contacts = [];

					// convert to normal Array
					//var contacts = Array.prototype.slice.call(contactElements);
					// loop through all contacts to extract information
					for (var i=0; i<contactElements.length; i++) {
						var contactElement = contactElements[i];

						// get id, and avatar url
						var imgDiv = contactElement.querySelector('div.avatar img.img.lazy');
						// if not found, skip now
						if (imgDiv == null) continue;
						var avatarUrl = imgDiv.getAttribute('src');
						// if url is malformed, skip now
						if (avatarUrl == null || avatarUrl == '') continue;
						// extract wechat id from url
						var wechatId = /.*username=(.+?)\&skey=.*/.exec(avatarUrl)[1];

						// get display name
						var h4 = contactElement.querySelector('div.info h4');
						// if not found, skip now
						if (h4 == null) continue;
						// extract display name
						var displayName = h4.innerHTML || h4.textContent;

						// push a new contact info into result array
						contacts.push({
							wechat_id: wechatId,
							display_name: displayName,
							avatar_url: avatarUrl
						});
					}

					// slice out overlapping contacts
					// set the starting index
					var startSliceIndex = 0;
					if (afterThisContact != null) {
						for (var i=0; i<contacts.length; i++) {
							var contact = contacts[i];
							if (contact.wechat_id === afterThisContact.wechat_id) {
								// set start index is next to this contact object
								startSliceIndex = i+1;

								// slice array
								contacts = contacts.slice(startSliceIndex);
								break;
							}
						}
					}

					// progress for one page
					scrollableDiv.scrollTop += scrollableDiv.clientHeight;

					// return result
					return contacts;
				}
			}
			else {
				return null;
			}
		}, afterThisContact);
	},

	/**
	 * Get scrollable div element's clientHeight property.
	 * @param  {Object} headless Headless object
	 * @return {Object} Promise object. Success contains {clientHeight, scrollHeight, scrollTop}. Failure contains null as result.
	 */
	getScrollableDivEssentialProperties: function(headless) {
		return headless.page.evaluate(function() {
			var scrollableDiv = document.querySelector('div.J_ContactScrollBody.scrollbar-dynamic.contact_list.scroll-content.scroll-scrolly_visible');
			if (scrollableDiv) {
				return {
					client_height: scrollableDiv.clientHeight,
					scroll_height: scrollableDiv.scrollHeight, 
					scroll_top: scrollableDiv.scrollTop
				};
			}
			else {
				return null;
			}
		});
	},

	/**
	 * Check whether the current page is login page or not.
	 * @param  {Object} headless Headless object
	 * @return {Object}          Promise object. Success contains either true/false depending on the status of whether it's login page or not, if it's not login page, then return true, otherwise return false. Failure contains null.
	 */
	checkIsLoginPage: function(headless) {
		return headless.page.evaluate(function() {
			// try to get search bar element (as user can activated on either chat or contact tab button) but search bar is always visible after login page, ...
			// then check if it's visible or not
			var searchbar = document.getElementById('search_bar');
			if (searchbar) {
				var boundingClient = searchbar.getBoundingClientRect();
				if (boundingClient.width === 0 &&
					  boundingClient.height === 0) {
					return true;
				}
				else {
					return false;
				}
			}
			else {
				// cannot find searchbar element, thus it's login page
				// (but the sourcecode usually contains such element)
				return true;
			}
		});
	}
};

module.exports = _;