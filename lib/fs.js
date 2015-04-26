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

    // You can't change the key of an existing object so we
    // have to delete() and add() instead of update()
    yield createDOMPromise(store().delete(node.path));

    node.directory = fspath.getDirectory(newPath);
    node.path = newPath;
    yield createDOMPromise(store().add(node));

    if (node.nodeType !== 'directory') {
      debug(`rename ${oldPath} ${newPath}: Done`);
      return;
    }

    // We also have to move our children.
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
  // TODO
};

exports.rmdir = function(path) {
  // TODO
};

/**
 * Does not honor the 2nd, optional mode arg.
 */
exports.mkdir = function(path) {
  debug(`mkdir ${path}`);
  return co(function*() {
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
      directory: fspath.getDirectory(filename),
      data: data,
      nodeType: 'file'
    };

    yield createDOMPromise(store().add(file));
    debug(`writeFile ${filename}: Done`);
  });
};

exports.appendFile = function(filename, data, options) {
  // TODO
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
