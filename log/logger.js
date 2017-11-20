/** 
  * logger that provides ability to disable or enable logging entirely
  without interfere with normal console.log
  */

var _ = {

	/**
	 * Flag indicates whether logging is enabled.
	 * @type {Boolean}
	 */
	logEnabled: true,
	/**
	 * Set whether to disable or enable logging.
	 * @param {Boolean} b True to enable logging, and false to disable it.
	 */
	setEnableLogging: function(b) { this.logEnabled = b; },

	/**
	 * Log in normal level.
	 *
	 * It wraps around console object. If logging is enabled, then it will log otherwise do nothing.
	 * 
	 * @param  {...[String]} args     Arguments to log
	 */
	log: function(...args) {
		if (this.logEnabled) {
			console.log(...args)
		}
	},

	/**
	 * Log in warn log-level.
	 *
	 * It wraps around console object. If logging is enabled, then it will log otherwise do nothing.
	 * 
	 * @param  {...[String]} args     Arguments to log
	 */
	warn: function(...args) {
		if (this.logEnabled) {
			console.warn(...args)
		}
	},

	/**
	 * Log in info log-level.
	 *
	 * It wraps around console object. If logging is enabled, then it will log otherwise do nothing.
	 * 
	 * @param  {...[String]} args     Arguments to log
	 */
	info: function(...args) {
		if (this.logEnabled) {
			console.info(...args)
		}
	},

	/**
	 * Log in error log-level.
	 *
	 * It wraps around console object. If logging is enabled, then it will log otherwise do nothing.
	 * 
	 * @param  {...[String]} args     Arguments to log
	 */
	error: function(...args) {
		if (this.logEnabled) {
			console.error(...args)
		}
	}
};

module.exports = _;