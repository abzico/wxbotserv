// this test just include index.js and start the bot
const wxbotserv = require('../index.js');
// just like that :)
wxbotserv((msgObj) => {
	if (msgObj.message === 'hello world') {
		return 'hey you!';
	}
	else {
		return 'you entered wrong message';
	}
	// return null; // if you don't care to reply message based on what received
});