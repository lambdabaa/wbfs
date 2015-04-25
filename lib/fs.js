let Stats = require('./stats');
let co = require('co');
let createDOMPromise = require('./create_dom_promise');
let fspath = require('./fspath');
let idb = require('./idb');
let indexGetAll = require('./index_get_all');

exports.rename = function(oldPath, newPath, store) {
  if (!store) {
    let db = idb.db;
    let trans = db.transaction('nodes', 'readwrite');
    store = trans.objecStore('nodes');
  }

  return co(function*() {
    let node = yield createDOMPromise(store.get(oldPath));
    if (!node) {
      throw new Error(`No such file or directory: ${oldPath}`);
    }

    node.directory = fspath.getDirectory(newPath);
    node.path = newPath;
    yield createDOMPromise(store.put(node));

    // We also have to move our children.
    let children = yield indexGetAll(store.index('directory'), {
      range: IDBKeyRange.only(oldPath)
    });

    if (children) {
      yield Promise.all(
        children.map(child => {
          let newChildPath = fspath.newChildPath(child.path, oldPath, newPath);
          return exports.rename(child.path, newChildPath, store);
        })
      );
    }
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
  // TODO
};

exports.rmdir = function(path) {
  // TODO
};

/**
 * Does not honor the 2nd, optional mode arg.
 */
exports.mkdir = function(path) {
  // TODO
};

exports.readdir = function(path) {
  // TODO
};

exports.close = function(fd) {
  // TODO
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

exports.readFile = function(filename, options) {
  // TODO
};

exports.writeFile = function(filename, data, options) {
  // TODO
};

exports.appendFile = function(filename, data, options) {
  // TODO
};

exports.Stats = Stats;
