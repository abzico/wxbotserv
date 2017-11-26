// this test just include index.js and start the bot
const wxbotserv = require('../index.js');

// listen once when we got all contacts
wxbotserv.events.on('onGotAllContacts', (contacts) => {
	console.log(`got all contacts (${contacts.length}): `, contacts);
});

// just like that :)
wxbotserv.start((msgObj) => {
	if (msgObj.message === 'test1') {
		return 'hey you!';
	}
	//return null; // if you don't care to reply message based on what received
});