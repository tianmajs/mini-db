var fs = require('fs'),
	mu = require('mini-util');

var PATTERN_SHARP = /##?/g,

	/**
	 * Compile filter string to function.
	 * @param filter {string}
	 */
	compile = (function () {
		var cache = {
			'': function () { return true; }
		};

		return function (filter) {
			filter = filter || '';
			if (!cache[filter]) {
				filter = 'return ('
					+ filter.replace(PATTERN_SHARP, function (sharp) {
							return sharp === '#' ? '__index' : '#';
						})
					+ ');'
				cache[filter] = new Function('$', '__index', filter);
			}
			return cache[filter];
		};
	}()),

	/**
	 * Create a Storage instance.
	 * @param filename {string}
	 */
	factory = (function () {
		var cache = {};

		return function (filename) {
			var instance = cache[filename];

			if (!instance) {
				instance = cache[filename] = new Storage({
					filename: filename
				});
			}

			return instance;
		};
	}()),

	/**
	 * Test whether an array value matches a filter.
	 * @param filter {string}
	 * @param value {*}
	 * @param index {number}
	 * @return {boolean}
	 */
	match = function (filter, value, index) {
		return !!compile(filter)(value, index);
	},

	// Storage constructor.
	Storage = mu.inherit(Object, {
		/**
		 * Initializer.
		 * @param config {Object}
		 */
		constructor: function (config) {
			var filename = this._filename = config.filename;

			if (!fs.existsSync(filename)) {
				fs.writeFileSync(filename, '{}');
			}

			this._data = JSON.parse(
				fs.readFileSync(filename, 'utf-8'));
		},

		/**
		 * Save change to disk.
		 * @param cb {function}
		 */
		_save: function (cb) {
			var filename = this._filename,
				data = this._data;
			cb = mu.isFunction(cb) ? cb : null;

			fs.writeFile(filename, JSON.stringify(data), cb );
		},

		/**
		 * Insert a new record.
		 * @param key {string}
		 * @param value {*}
		 * @param [cb] {function}
		 * @return {Object}
		 */
		insert: function (key, value, cb) {
			var data = this._data;

			if (!data[key]) {
				data[key] = [ value ];
			} else {
				data[key].push(value);
			}

			this._save(cb);

			return this;
		},

		/**
		 * Remove records.
		 * @param key {string}
		 * @param [filter] {string}
		 * @param [cb] {function}
		 * @return {Object}
		 */
		remove: function (key, filter, cb) {
			var data = this._data,
				arr = data[key],
				i;
			if(mu.isFunction(filter)){
				cb = filter;
				filter = null;
			}
			if (arr) {
				for (i = 0; i < arr.length; ++i) {
					if (match(filter, arr[i], i)) {
						// Set to undefined first to keep indexes of other value unchanged.
						arr[i] = undefined;
					}
				}

				arr = arr.filter(function (value) { // Compact array.
					return value !== undefined;
				});

				if (arr.length === 0) {
					// Delete empty property.
					delete data[key];
				} else {
					data[key] = arr;
				}
			}

			this._save(cb);

			return this;
		},

		/**
		 * Select records.
		 * @param key {string}
		 * @param [filter] {string}
		 * @return {Array}
		 */
		select: function (key, filter) {
			var data = this._data,
				arr = data[key],
				result = [],
				i, len;

			if (arr) {
				for (i = 0, len = arr.length; i < len; ++i) {
					if (match(filter, arr[i], i)) {
						// todo deep clone
						result.push(arr[i]);
					}
				}
			}

			return result;
		},

		/**
		 * Update records.
		 * @param key {string}
		 * @param value {*}
		 * @param [filter] {string}
		 * @param [cb] {function}
		 * @return {Object}
		 */
		update: function (key, value, filter, cb) {
			var data = this._data,
				arr = data[key],
				i, len;
			if(mu.isFunction(filter)){
				cb = filter;
				filter = null;
			}
			if (arr) {
				for (i = 0, len = arr.length; i < len; ++i) {
					if (match(filter, arr[i], i)) {
						// arr[i] = value;
						arr[i] = mu.mix(arr[i],value);
					}
				}
			}

			this._save(cb);

			return this;
		}
	});

module.exports = factory;
