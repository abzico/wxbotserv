const eventsConst = require('./events-const.js');
const EventEmitter = require('events').EventEmitter;
// create event emitter
// the idea is to share only one EventEmitter for entire life-cycle of application
const ee = new EventEmitter();

module.exports = {
	/**
	 * Add a new listener for event.
	 * @param  {String}   eventName Event name. Use string as found in events-const.js for event name.
	 * @param  {Function} callback  Callback function to execute when such event occurs.
	 */
	on: function(eventName, callback) {
		ee.addListener(eventName, callback);
	},

	/**
	 * Remove listener from listening to event.
	 * @param  {String}   eventName Event name. Use string as found in events-const.js for event name.
	 * @param  {Function} callback  Callback function to be removed.
	 */
	off: function(eventName, callback) {
		ee.removeListener(eventName, callback);
	},

	/**
	 * Add a listener listening to an event only one time. After that it will be removed.
	 * @param  {String}   eventName Event name. Use string as found in events-const.js for event name.
	 * @param  {Function} callback  Callback function to execute when such event occurs.
	 */
	once: function(eventName, callback) {
		ee.once(eventName, callback);
	},

	/**
	 * Emit event.
	 * @param  {String}    eventName Event name. Use string as found in events-const.js for event name.
	 * @param  {...[Any]} args      (optional) Arguments to send alongside such event.
	 */
	emit: function(eventName, ...args) {
		ee.emit(eventName, ...args);
	}
}