// this test just include index.js and start the bot
const wxbotserv = require('../index.js');

// listen once when we got all contacts
wxbotserv.events.on('onGotAllContacts', (contacts) => {
	console.log('got all contacts: ', contacts);
});

// just like that :)
wxbotserv.start((msgObj) => {
	// if (msgObj.message === 'hello world') {
	// 	return 'hey you!';
	// }
	// else {
	// 	return 'you entered wrong message';
	// }
	return null; // if you don't care to reply message based on what received
});