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
