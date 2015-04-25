var co = require('co');
var fs = require('./lib/fs');
var idb = require('./lib/idb');

module.exports = new Proxy(fs, {
  apply: function(target, thisArg, args) {
    return co(function*() {
      yield idb.open();
      target.apply(thisArg, args);
    });
  }
});
