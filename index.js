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
