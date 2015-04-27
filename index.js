var co = require('co');
var debug = require('debug');
var fs = require('./lib/fs');
var idb = require('./lib/idb');

debug.enable && debug.enable('*');

var sync = [fs.watch].map(fn => fn.toString());

function isSync(fn) {
  return sync.indexOf(fn.toString()) !== -1;
}

for (var key in fs) {
  exports[key] = new Proxy(fs[key], {
    apply: function(target, thisArg, args) {
      if (isSync(target)) {
        return target.apply(thisArg, args);
      }

      return co(function*() {
        yield idb.open();
        return target.apply(thisArg, args);
      });
    }
  });
}
