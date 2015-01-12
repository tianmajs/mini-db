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

	/**
	 * deep clone object
	 */
	clone = function (source){
		if(!mu.isObject(source)){
			throw new Error('invalid object , only object can be cloned !');
		}
		var copy;
		try{
			copy = JSON.parse(JSON.stringify(source));
		}catch(e){
			copy = {};
		}
		return copy;
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
			fs.writeFile(filename, JSON.stringify(data,null,2), cb );
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

			this._save(function (err){
				if(mu.isFunction(cb)){
					cb(err,value);
				}
			});

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
				removed = [],
				i;
			if(mu.isFunction(filter)){
				cb = filter;
				filter = null;
			}
			if (arr) {
				for (i = 0; i < arr.length; ++i) {
					if (match(filter, arr[i], i)) {
						removed.push(arr[i]);
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

			this._save(function (err){
				if(mu.isFunction(cb)){
					cb(err,removed);
				}
			});

			return this;
		},

		/**
		 * Select records.
		 * @param key {string}
		 * @param [filter] {string}
		 * @param [cb] {function}
		 * @return {Array}
		 */
		select: function (key, filter, cb) {
			var data = this._data,
				arr = data[key],
				result = [],
				i, len;
			if(mu.isFunction(filter)){
				cb = filter;
				filter = null;
			}
			if (arr) {
				for (i = 0, len = arr.length; i < len; ++i) {
					if (match(filter, arr[i], i)) {
						result.push(clone(arr[i]));//  deep clone
					}
				}
			}
			if(mu.isFunction(cb)){
				setImmediate(function(){
					cb(null,result);
				});
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
				updated = [],
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
						updated.push(arr[i]);
					}
				}
			}

			this._save(function (err){
				if(mu.isFunction(cb)){
					cb(err,updated);
				}
			});

			return this;
		}
	});

module.exports = factory;
