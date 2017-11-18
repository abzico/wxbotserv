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
			}
		})
		.catch((err) => {
			console.log(err);
		});
}
};

module.exports = _;