(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.webfs = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var co = require('co');
var debug = require('debug');
var fs = require('./lib/fs');
var idb = require('./lib/idb');

debug.enable && debug.enable('*');

for (var key in fs) {
  exports[key] = new Proxy(fs[key], {
    apply: function(target, thisArg, args) {
      return co(function*() {
        yield idb.open();
        return target.apply(thisArg, args);
      });
    }
  });
}

},{"./lib/fs":3,"./lib/idb":5,"co":8,"debug":9}],2:[function(require,module,exports){
'use strict';
module.exports = function createDOMPromise(request) {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error || request.errorCode);
    if (request instanceof IDBTransaction) {
      request.oncomplete = resolve;
    } else {
      request.onsuccess = () => resolve(request.result);
    }
  });
};

},{}],3:[function(require,module,exports){
'use strict';
var Stats = require('./stats');
var co = require('co');
var createDOMPromise = require('./create_dom_promise');
var debug = require('debug')('fs');
var fspath = require('./fspath');
var idb = require('./idb');
var indexGetAll = require('./index_get_all');

exports.rename = function(oldPath, newPath) {
  debug(`rename ${oldPath} ${newPath}`);
  return co(function*() {
    var node = yield createDOMPromise(store('readonly').get(oldPath));
    if (!node) {
      return Promise.reject(new Error(`${oldPath}: No such file or directory`));
    }

    node.directory = fspath.getDirectory(newPath);
    node.path = newPath;

    if (node.nodeType === 'file') {
      // You can't change the key of an existing object so we
      // have to delete() and add() instead of update()
      yield exports.unlink(oldPath);
      yield createDOMPromise(store().add(node));
    } else {
      // Create the new directory.
      yield createDOMPromise(store().add(node));

      // Move our children to the new directory.
      var children = yield indexGetAll(store('readonly').index('directory'), {
        range: IDBKeyRange.only(oldPath)
      });

      if (children) {
        yield Promise.all(
          children.map(child => {
            var newChildPath = fspath.newChildPath(child.path, oldPath, newPath);
            return exports.rename(child.path, newChildPath);
          })
        );
      }

      // Remove the old directory.
      yield exports.rmdir(oldPath);
    }

    debug(`rename ${oldPath} ${newPath}: Done`);
  });
};

exports.ftruncate = function(fd, len) {
  // TODO
};

exports.truncate = function(path, len) {
  // TODO
};

exports.stat = function(path) {
  // TODO
};

exports.lstat = function(path) {
  // TODO
};

exports.fstat = function(fd) {
  // TODO
};

exports.link = function(srcpath, dstpath) {
  // TODO
};

exports.symlink = function(srcpath, dstpath, type) {
  // TODO
};

exports.readlink = function(path) {
  // TODO
};

exports.realpath = function(path, cache) {
  // TODO
};

exports.unlink = function(path) {
  debug(`unlink ${path}`)
  return co(function*() {
    var node = yield createDOMPromise(store('readonly').get(path));
    if (node.nodeType === 'directory') {
      return Promise.reject(new Error(`Cannot remove ${path}: Is a directory`));
    }

    yield createDOMPromise(store().delete(path));
    debug(`unlink ${path}: Done`);
  });
};

exports.rmdir = function(path) {
  debug(`rmdir ${path}`);
  return co(function*() {
    var node = yield createDOMPromise(store('readonly').get(path));
    if (node.nodeType === 'file') {
      return Promise.reject(new Error(`Cannot remove ${path}: Not a directory`));
    }

    var children = yield indexGetAll(store('readonly').index('directory'), {
      range: IDBKeyRange.only(path)
    });

    if (children.length) {
      return Promise.reject(new Error(`Cannot remove ${path}: Directory not empty`));
    }

    yield createDOMPromise(store().delete(path));
    debug(`rmdir ${path}: Done`);
  });
};

/**
 * Does not honor the 2nd, optional mode arg.
 */
exports.mkdir = function(path) {
  debug(`mkdir ${path}`);
  return co(function*() {
    // Make sure that parent directory exists.
    var directory = fspath.getDirectory(path);
    var parent = yield createDOMPromise(store().get(directory));
    if (!parent) {
      return Promise.reject(new Error(`${directory}: No such file or directory`));
    }
    if (parent.nodeType === 'file') {
      return Promise.reject(new Error(`${directory}: Not a directory`));
    }

    var node = yield createDOMPromise(store().get(path));
    if (node) {
      return Promise.reject(new Error(`Cannot create directory ${path}: File exists`));
    }

    var dir = {
      path: path,
      directory: fspath.getDirectory(path),
      nodeType: 'directory'
    };

    yield createDOMPromise(store().add(dir));
    debug(`mkdir ${path}: Done`);
  });
};

exports.readdir = function(path) {
  debug(`readdir ${path}`);
  return co(function*() {
    var dir = yield createDOMPromise(store('readonly').get(path));
    if (!dir) {
      return Promise.reject(new Error(`${path}: No such file or directory`));
    }

    if (dir.nodeType !== 'directory') {
      return Promise.reject(new Error(`${path}: Not a directory`));
    }

    var index = store('readonly').index('directory');
    var files = yield indexGetAll(index, {
      range: IDBKeyRange.only(path)
    });

    return files.map(file => fspath.getFilename(file.path));
  });
};

/**
 * Does not honor the 3rd, optional mode arg.
 */
exports.open = function(path, flags) {
  // TODO
};

exports.utimes = function(path, atime, mtime) {
  // TODO
};

exports.futimes = function(fd, atime, mtime) {
  // TODO
};

exports.fsync = function(fd) {
  // TODO
};

exports.write = function(fd, data, position, encoding) {
  // TODO
};

exports.readFile = function(filename) {
  debug(`readFile ${filename}`);
  return co(function*() {
    var node = yield createDOMPromise(store('readonly').get(filename));
    if (!node) {
      return Promise.reject(new Error(`${filename}: No such file or directory`));
    }

    if (node.nodeType === 'directory') {
      return Promise.reject(new Error(`${filename}: Is a directory`));
    }

    return node.data;
  });
};

exports.writeFile = function(filename, data) {
  debug(`writeFile ${filename}`);
  return co(function*() {
    // Make sure that parent directory exists.
    var directory = fspath.getDirectory(filename);
    var parent = yield createDOMPromise(store().get(directory));
    if (!parent) {
      return Promise.reject(new Error(`${directory}: No such file or directory`));
    }
    if (parent.nodeType === 'file') {
      return Promise.reject(new Error(`${directory}: Not a directory`));
    }

    var node = yield createDOMPromise(store().get(filename));
    if (node) {
      if (node.nodeType === 'directory') {
        return Promise.reject(new Error(`${filename}: Is a directory`));
      }

      debug(`writeFile ${filename}: Will overwrite existing data`);
      node.data = data;
      yield createDOMPromise(store().put(node));
      debug(`writeFile ${filename}: Done`);
      return;
    }

    var file = {
      path: filename,
      directory: directory,
      data: data,
      nodeType: 'file'
    };

    yield createDOMPromise(store().add(file));
    debug(`writeFile ${filename}: Done`);
  });
};

exports.appendFile = function(filename, data, options) {
  debug(`appendFile ${filename}`);
  return co(function*() {
    var node = yield createDOMPromise(store('readonly').get(filename));
    if (!node) {
      return yield exports.writeFile(filename, data);
    }

    node.data += data;
    yield createDOMPromise(store().put(node));
    debug(`appendFile ${filename}: Done`);
  });
};

exports.shutdown = function() {
  idb.close();
};

exports.Stats = Stats;

function store(capabilities) {
  var db = idb.db;
  var trans = db.transaction('nodes', capabilities || 'readwrite');
  return trans.objectStore('nodes');
}

},{"./create_dom_promise":2,"./fspath":4,"./idb":5,"./index_get_all":6,"./stats":7,"co":8,"debug":9}],4:[function(require,module,exports){
'use strict';
exports.getDirectory = function(path) {
  if (typeof path !== 'string' || path.indexOf('/') !== 0) {
    throw new Error(`${path} is not an absolute path`);
  }

  if (path === '/') {
    throw new Error('/ is the top-level directory');
  }

  var lastSlashIndex = path.lastIndexOf('/');
  return lastSlashIndex === 0 ? '/' : path.substring(0, lastSlashIndex);
};

exports.getFilename = function(filepath) {
  return filepath.substring(filepath.lastIndexOf('/') + 1, filepath.length);
};

exports.newChildPath = function(oldChildPath, oldParentPath, newParentPath) {
  return oldChildPath.replace(oldParentPath, newParentPath);
};

},{}],5:[function(require,module,exports){
'use strict';
var co = require('co');
var createDOMPromise = require('./create_dom_promise');

exports.open = function() {
  return co(function*() {
    if (exports.db instanceof IDBDatabase) {
      return;
    }

    var request = indexedDB.open('fs');
    request.onupgradeneeded = event => {
      var db = event.target.result;
      var store = db.createObjectStore('nodes', { keyPath: 'path' });
      store.createIndex('directory', 'directory', { unique: false });
      store.add({
        path: '/',
        directory: null,
        nodeType: 'directory'
      });
    };

    exports.db = yield createDOMPromise(request);
  });
};

exports.close = function() {
  if (exports.db) {
    exports.db.close();
    exports.db = null;
  }
};

exports.db = null;

},{"./create_dom_promise":2,"co":8}],6:[function(require,module,exports){
'use strict';
module.exports = function indexGetAll(index, options) {
  var result = [];
  var request = index.openCursor(options.range);

  return new Promise((resolve, reject) => {
    request.onerror = reject;
    request.onsuccess = event => {
      var cursor = event.target.result;
      if (!cursor) {
        return resolve(result);
      }

      result.push(cursor.value);
      cursor.continue();
    };
  });
}

},{}],7:[function(require,module,exports){
'use strict';
function Stats() {
}
module.exports = Stats;

Stats.prototype = {
  isFile: function() {
    // TODO
  },

  isDirectory: function() {
    // TODO
  },

  isBlockDevice: function() {
    // TODO
  },

  isCharacterDevice: function() {
    // TODO
  },

  isSymbolicLink: function() {
    // TODO
  },

  isFIFO: function() {
    // TODO
  },

  isSocket: function() {
    // TODO
  }
};

},{}],8:[function(require,module,exports){

/**
 * slice() reference.
 */

var slice = Array.prototype.slice;

/**
 * Expose `co`.
 */

module.exports = co['default'] = co.co = co;

/**
 * Wrap the given generator `fn` into a
 * function that returns a promise.
 * This is a separate function so that
 * every `co()` call doesn't create a new,
 * unnecessary closure.
 *
 * @param {GeneratorFunction} fn
 * @return {Function}
 * @api public
 */

co.wrap = function (fn) {
  createPromise.__generatorFunction__ = fn;
  return createPromise;
  function createPromise() {
    return co.call(this, fn.apply(this, arguments));
  }
};

/**
 * Execute the generator function or a generator
 * and return a promise.
 *
 * @param {Function} fn
 * @return {Promise}
 * @api public
 */

function co(gen) {
  var ctx = this;

  // we wrap everything in a promise to avoid promise chaining,
  // which leads to memory leak errors.
  // see https://github.com/tj/co/issues/180
  return new Promise(function(resolve, reject) {
    if (typeof gen === 'function') gen = gen.call(ctx);
    if (!gen || typeof gen.next !== 'function') return resolve(gen);

    onFulfilled();

    /**
     * @param {Mixed} res
     * @return {Promise}
     * @api private
     */

    function onFulfilled(res) {
      var ret;
      try {
        ret = gen.next(res);
      } catch (e) {
        return reject(e);
      }
      next(ret);
    }

    /**
     * @param {Error} err
     * @return {Promise}
     * @api private
     */

    function onRejected(err) {
      var ret;
      try {
        ret = gen.throw(err);
      } catch (e) {
        return reject(e);
      }
      next(ret);
    }

    /**
     * Get the next value in the generator,
     * return a promise.
     *
     * @param {Object} ret
     * @return {Promise}
     * @api private
     */

    function next(ret) {
      if (ret.done) return resolve(ret.value);
      var value = toPromise.call(ctx, ret.value);
      if (value && isPromise(value)) return value.then(onFulfilled, onRejected);
      return onRejected(new TypeError('You may only yield a function, promise, generator, array, or object, '
        + 'but the following object was passed: "' + String(ret.value) + '"'));
    }
  });
}

/**
 * Convert a `yield`ed value into a promise.
 *
 * @param {Mixed} obj
 * @return {Promise}
 * @api private
 */

function toPromise(obj) {
  if (!obj) return obj;
  if (isPromise(obj)) return obj;
  if (isGeneratorFunction(obj) || isGenerator(obj)) return co.call(this, obj);
  if ('function' == typeof obj) return thunkToPromise.call(this, obj);
  if (Array.isArray(obj)) return arrayToPromise.call(this, obj);
  if (isObject(obj)) return objectToPromise.call(this, obj);
  return obj;
}

/**
 * Convert a thunk to a promise.
 *
 * @param {Function}
 * @return {Promise}
 * @api private
 */

function thunkToPromise(fn) {
  var ctx = this;
  return new Promise(function (resolve, reject) {
    fn.call(ctx, function (err, res) {
      if (err) return reject(err);
      if (arguments.length > 2) res = slice.call(arguments, 1);
      resolve(res);
    });
  });
}

/**
 * Convert an array of "yieldables" to a promise.
 * Uses `Promise.all()` internally.
 *
 * @param {Array} obj
 * @return {Promise}
 * @api private
 */

function arrayToPromise(obj) {
  return Promise.all(obj.map(toPromise, this));
}

/**
 * Convert an object of "yieldables" to a promise.
 * Uses `Promise.all()` internally.
 *
 * @param {Object} obj
 * @return {Promise}
 * @api private
 */

function objectToPromise(obj){
  var results = new obj.constructor();
  var keys = Object.keys(obj);
  var promises = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var promise = toPromise.call(this, obj[key]);
    if (promise && isPromise(promise)) defer(promise, key);
    else results[key] = obj[key];
  }
  return Promise.all(promises).then(function () {
    return results;
  });

  function defer(promise, key) {
    // predefine the key in the result
    results[key] = undefined;
    promises.push(promise.then(function (res) {
      results[key] = res;
    }));
  }
}

/**
 * Check if `obj` is a promise.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isPromise(obj) {
  return 'function' == typeof obj.then;
}

/**
 * Check if `obj` is a generator.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */

function isGenerator(obj) {
  return 'function' == typeof obj.next && 'function' == typeof obj.throw;
}

/**
 * Check if `obj` is a generator function.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */
function isGeneratorFunction(obj) {
  var constructor = obj.constructor;
  if (!constructor) return false;
  if ('GeneratorFunction' === constructor.name || 'GeneratorFunction' === constructor.displayName) return true;
  return isGenerator(constructor.prototype);
}

/**
 * Check for plain object.
 *
 * @param {Mixed} val
 * @return {Boolean}
 * @api private
 */

function isObject(val) {
  return Object == val.constructor;
}

},{}],9:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Use chrome.storage.local if we are in an app
 */

var storage;

if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined')
  storage = chrome.storage.local;
else
  storage = localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      storage.removeItem('debug');
    } else {
      storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":10}],10:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":11}],11:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}]},{},[1])(1)
});