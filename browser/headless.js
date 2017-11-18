require('../promise-retry.js');
const phantom = require('phantom');
let _ph, _page;

function setupEventListeners(options) {
	if (_page == null || options == null) return;

	if (options.onLoadFinished) {
		_page.on('onLoadFinished', (status) => {
			options.onLoadFinished(status);
		});
	}
	if (options.onResourceRequested) {
		_page.on('onResourceRequested', (requestData) => {
			options.onResourceRequested(requestData);
		});
	}
	if (options.onResourceReceived) {
		_page.on('onResourceReceived', (resource) => {
			options.onResourceReceived(resource);
		});
	}
}

var _ = {
	// page property
	page: _page,
	// instance
	instance: _ph,

	/**
	 * Open a new page for specified url.
	 * @param  {String} url URL to open
	 * @param {Object} options It can be { onLoadFinished: (status), onResourceRequested: (requestData), onResourceReceived: (resource) }. All properties are optional.
	 * @return {Object}     Promise object. Success will contain result from opening page. Otherwise return error object.
	 */
	openURL: function(url, options) {

		return new Promise((resolve, reject) => {
			phantom.create()
				.then((ph) => {
					_ph = ph;
					this.instance = _ph;
					return _ph.createPage();
				}, (err) => {
					reject(err);
				})

				.then((page) => {
					_page = page;
					this.page = _page;

					// set event listeners
					setupEventListeners(options);

					return _page.open(url);
				}, (err) => {
					reject(err);
				})

				.then((status) => {
					resolve(_page.property('content'));
				}, (err) => {
					reject(err);
				})
		});
	},

	/**
	 * Clear resource
	 */
	clear: function() {
		if (_ph) {
			_ph.exit();
		}
	}
};

module.exports = _;