const wxMediator = require('./wechat/mediator.js');

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
			if (newMsgs != 0) {
				console.log(`found (${newMsgs}) new messages`);

				// process the message
				wxMediator.getLatestNMsg(headless, newMsgs)
					.then((res) => {
						console.log('got msgs: ' + res);
					})
					.catch((err) => {
						console.log(err);
					});

				// click on filehelper to allow us to detect new msgs again
				wxMediator.clickOnFilehelper(headless)
					.then((foundAndClicked) => {
						if (foundAndClicked) {
							console.log('clicked on filehelper');
						}
					})
					.catch((err) => {
						console.log(err);
					});
			}
		})
		.catch((err) => { 
			console.log(err); 
		});

	// check muted new msg
	wxMediator.checkNewMutedMsg(headless)
		.then((found) => {
			if (found) {
				console.log('found new message');

				// process message

				// click on filehelper to allow us to detect new msgs again
				wxMediator.clickOnFilehelper(headless)
					.then((foundAndClicked) => {
						if (foundAndClicked) {
							console.log('clicked on filehelper');
						}
					})
					.catch((err) => {
						console.log(err);
					});
			}
		})
		.catch((err) => {
			console.log(err);
		});
}
};

module.exports = _;