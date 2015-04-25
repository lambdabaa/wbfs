let co = require('co');
let createDOMPromise = require('./create_dom_promise');

exports.open = function() {
  return co(function*() {
    if (exports.idb instanceof IDBDatabase) {
      return;
    }

    let request = indexedDB.open('fs');
    request.onupgradeneeded = event => {
      let db = event.target.result;
      let store = db.createObjectStore('nodes', { keyPath: 'path' });
      store.createIndex('directory', 'directory', { unique: false });
    };

    exports.idb = yield createDOMPromise(request);
  });
};

exports.idb = null;
