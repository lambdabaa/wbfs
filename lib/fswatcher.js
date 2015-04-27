'use strict';

var EventEmitter = require('eventemitter2').EventEmitter2;
var fspath = require('./fspath');

/**
 * Options:
 *
 *   (Boolean) recursive whether all subdirectories should be watched.
 */
function FSWatcher(fs, filename, options, listener) {
  EventEmitter.call(this, { newListener: false });
  this.fs = fs;
  this.filename = filename;
  this.recursive = !!options.recursive;
  this.listener = listener;
  this._onchange = this._onchange.bind(this);
  this.fs.on('change', this._onchange);
  this._onrename = this._onrename.bind(this);
  this.fs.on('rename', this._onrename);
}
module.exports = FSWatcher;

FSWatcher.prototype = {
  __proto__: EventEmitter.prototype,

  close: function() {
    this.fs.removeListener('change', this._onchange);
    this.fs.removeListener('rename', this._onrename);
  },

  _onchange: function(filename) {
    if (this._includes(filename)) {
      var details = { filename: filename };
      this.emit('change', details);
      this.listener && this.listener('change', details);
    }
  },

  _onrename: function(oldName, newName) {
    if (this._includes(oldName)) {
      var details = { oldName: oldName, newName: newName };
      this.emit('rename', details);
      this.listener && this.listener('rename', details);
    }
  },

  _includes: function(filename) {
    return filename === this.filename ||
           (this.recursive && fspath.contains(this.filename, filename));
  }
};
